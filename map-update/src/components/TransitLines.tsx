import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, Pane, Polyline, Tooltip, useMapEvents } from 'react-leaflet';
import type { Feature, FeatureCollection, LineString, MultiLineString, Point } from 'geojson';
import fallbackLines from '../data/transportLines.json';
import type { Theme } from '../theme';

type LineProps = { ref?: string; name: string; color: string; mode?: string };
type LineFeature = Feature<LineString | MultiLineString, LineProps>;
type StopFeature = Feature<Point, { name?: string; color?: string }>;

const toLatLngs = (coords: number[][]) => coords.map(([lng, lat]) => [lat, lng] as [number, number]);

// Light rail drawn first, then metro, then trains on top — roughly how Google layers them.
const ORDER: Record<string, number> = { light_rail: 0, subway: 1, train: 2 };

/**
 * Draws the real T / M / L lines from public/transit-lines.json
 * (generated from OpenStreetMap by scripts/fetch-transit-lines.mjs).
 * Falls back to the small hand-drawn file if that hasn't been generated yet.
 */
export default function TransitLines({ theme }: { theme: Theme }) {
  const [lines, setLines] = useState<LineFeature[]>(
    (fallbackLines as FeatureCollection).features as LineFeature[],
  );
  const [stops, setStops] = useState<StopFeature[]>([]);
  const [zoom, setZoom] = useState(14);

  useMapEvents({ zoomend: e => setZoom(e.target.getZoom()) });

  useEffect(() => {
    fetch('/transit-lines.json')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((fc: FeatureCollection) => {
        const ls = fc.features.filter(f => f.geometry.type !== 'Point') as LineFeature[];
        if (!ls.length) return;
        ls.sort((a, b) => (ORDER[a.properties.mode ?? 'train'] ?? 2) - (ORDER[b.properties.mode ?? 'train'] ?? 2));
        setLines(ls);
        setStops(fc.features.filter(f => f.geometry.type === 'Point') as StopFeature[]);
      })
      .catch(() => {
        /* keep fallback */
      });
  }, []);

  const casing = theme === 'dark' ? '#121417' : '#ffffff';
  const weight = zoom >= 15 ? 5 : zoom >= 13 ? 4 : 3;
  const drawn = useMemo(
    () =>
      lines.map((line, i) => {
        const g = line.geometry;
        return {
          key: line.properties.ref ?? `${line.properties.name}-${i}`,
          props: line.properties,
          parts: g.type === 'LineString' ? [toLatLngs(g.coordinates)] : g.coordinates.map(toLatLngs),
        };
      }),
    [lines],
  );

  return (
    <>
      <Pane name="transit-lines" style={{ zIndex: 350 }}>
        {/* All outlines first, then all coloured lines, so lines sharing a corridor stay visible. */}
        {drawn.map(({ key, parts }) => (
          <Polyline
            key={`casing-${key}`}
            positions={parts}
            pathOptions={{ color: casing, weight: weight + 3, opacity: 0.9 }}
            interactive={false}
          />
        ))}
        {drawn.map(({ key, parts, props }) => (
          <Polyline key={`line-${key}`} positions={parts} pathOptions={{ color: props.color, weight, opacity: 1 }}>
            <Tooltip sticky>
              {props.ref ? <strong>{props.ref} </strong> : null}
              {props.name}
            </Tooltip>
          </Polyline>
        ))}
      </Pane>

      {zoom >= 13 && (
        <Pane name="transit-stops" style={{ zIndex: 360 }}>
          {stops.map((s, i) => (
            <CircleMarker
              key={i}
              center={[s.geometry.coordinates[1], s.geometry.coordinates[0]]}
              radius={zoom >= 15 ? 5 : 3.5}
              pathOptions={{ color: s.properties.color ?? '#555', weight: 2, fillColor: casing, fillOpacity: 1 }}
            >
              {s.properties.name && <Tooltip direction="top">{s.properties.name}</Tooltip>}
            </CircleMarker>
          ))}
        </Pane>
      )}
    </>
  );
}
