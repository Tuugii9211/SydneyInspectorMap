#!/usr/bin/env node
/**
 * Downloads Sydney's train (T), metro (M) and light rail (L) lines from OpenStreetMap
 * and saves them to public/transit-lines.json, which the map draws.
 *
 *   node scripts/fetch-transit-lines.mjs              # always re-download
 *   node scripts/fetch-transit-lines.mjs --if-missing # only if the file doesn't exist (used by `npm run build`)
 *
 * Map data © OpenStreetMap contributors, ODbL.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'transit-lines.json');

if (process.argv.includes('--if-missing') && existsSync(OUT)) {
  console.log('transit-lines.json already exists, skipping download (run `npm run lines` to refresh).');
  process.exit(0);
}

// Greater Sydney, Blue Mountains to the coast.
const BBOX = '-34.3,150.4,-33.3,151.5';
const QUERY = `[out:json][timeout:180];
rel["type"="route"]["route"~"^(train|subway|light_rail)$"]["ref"~"^[TML][0-9]+$"](${BBOX})->.routes;
.routes out geom;
node(r.routes);
out;`;

const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

// Official TfNSW colours and names, used when OpenStreetMap doesn't have them.
const LINES = {
  T1: ['North Shore & Western Line', '#F99D1C'],
  T2: ['Leppington & Inner West Line', '#0098CD'],
  T3: ['Liverpool & Inner West Line', '#F37021'],
  T4: ['Eastern Suburbs & Illawarra Line', '#005AA3'],
  T5: ['Cumberland Line', '#C4258F'],
  T6: ['Lidcombe & Bankstown Line', '#7D3F21'],
  T7: ['Olympic Park Line', '#6F818E'],
  T8: ['Airport & South Line', '#00954C'],
  T9: ['Northern Line', '#D11F2F'],
  M1: ['Metro North West & Bankstown Line', '#168388'],
  L1: ['Dulwich Hill Line', '#BE1622'],
  L2: ['Randwick Line', '#DD1E25'],
  L3: ['Kingsford Line', '#781140'],
  L4: ['Westmead & Carlingford Line', '#BB2043'],
};

async function overpass() {
  for (const url of SERVERS) {
    try {
      console.log(`Downloading lines from ${new URL(url).host}…`);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'SydneyInspectorMap/1.0' },
        body: 'data=' + encodeURIComponent(QUERY),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.elements?.length) throw new Error('empty response');
      return json.elements;
    } catch (err) {
      console.warn(`  failed: ${err.message}`);
    }
  }
  throw new Error('All Overpass servers failed');
}

const round = n => Math.round(n * 1e5) / 1e5;
const cleanColour = c => (/^#?[0-9a-f]{6}$/i.test(c ?? '') ? (c.startsWith('#') ? c : '#' + c) : null);
const stationName = n =>
  n
    ?.replace(/\s*,?\s*(Platform|Plat|Stand|Wharf)\b.*$/i, '')
    .replace(/\s+(Station|Light Rail|Metro)$/i, '')
    .trim();

try {
  const elements = await overpass();
  const relations = elements.filter(e => e.type === 'relation');
  const nodeTags = new Map(elements.filter(e => e.type === 'node').map(n => [n.id, n]));

  // Each line has a relation per direction (and sometimes per branch): merge by ref, dedupe ways.
  const byRef = new Map();
  const stopRoles = /^(stop|stop_entry_only|stop_exit_only)$/;
  for (const rel of relations) {
    const ref = rel.tags.ref.toUpperCase();
    const line = byRef.get(ref) ?? { ref, tags: rel.tags, ways: new Map(), stops: new Set() };
    for (const m of rel.members ?? []) {
      if (m.type === 'way' && m.geometry && !/platform/.test(m.role)) line.ways.set(m.ref, m.geometry);
      if (m.type === 'node' && stopRoles.test(m.role)) line.stops.add(m.ref);
    }
    byRef.set(ref, line);
  }

  const features = [];
  const stations = [];
  const modeOf = r => (r.startsWith('M') ? 'subway' : r.startsWith('L') ? 'light_rail' : 'train');

  for (const line of [...byRef.values()].sort((a, b) => a.ref.localeCompare(b.ref, 'en', { numeric: true }))) {
    const [fallbackName, fallbackColour] = LINES[line.ref] ?? [line.tags.name ?? line.ref, '#666666'];
    const color = cleanColour(line.tags.colour) ?? fallbackColour;
    const coords = [...line.ways.values()]
      .map(g => g.filter(Boolean).map(p => [round(p.lon), round(p.lat)]))
      .filter(c => c.length > 1);
    if (!coords.length) continue;
    features.push({
      type: 'Feature',
      properties: { ref: line.ref, name: fallbackName, color, mode: modeOf(line.ref) },
      geometry: { type: 'MultiLineString', coordinates: coords },
    });

    // One dot per station: platforms of the same station within ~250 m are merged.
    for (const id of line.stops) {
      const n = nodeTags.get(id);
      if (!n) continue;
      const name = stationName(n.tags?.name);
      const near = stations.find(
        s => (name && s.name === name && Math.abs(s.lat - n.lat) < 0.0025 && Math.abs(s.lon - n.lon) < 0.003) ||
          (Math.abs(s.lat - n.lat) < 0.0004 && Math.abs(s.lon - n.lon) < 0.0005),
      );
      if (!near) stations.push({ name, lat: n.lat, lon: n.lon, color });
    }
  }

  for (const s of stations) {
    features.push({
      type: 'Feature',
      properties: { name: s.name, color: s.color },
      geometry: { type: 'Point', coordinates: [round(s.lon), round(s.lat)] },
    });
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ type: 'FeatureCollection', attribution: '© OpenStreetMap contributors (ODbL)', features }));
  const lineRefs = features.filter(f => f.properties.ref).map(f => f.properties.ref);
  console.log(`Saved ${lineRefs.length} lines (${lineRefs.join(', ')}) and ${stations.length} stations to public/transit-lines.json`);
} catch (err) {
  console.warn(`Could not download transit lines (${err.message}). The map will use the small built-in line file.`);
  // Never fail the build over this.
}
