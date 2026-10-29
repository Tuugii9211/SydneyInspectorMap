import { useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, ZoomControl } from 'react-leaflet';
import type { Report } from '../services/reports';
import type { Theme } from '../theme';
import TransitLines from './TransitLines';

const SYDNEY_CBD: [number, number] = [-33.8688, 151.2093];

// CARTO basemaps: clean "default map" style, with matching light and dark versions.
const TILES: Record<Theme, string> = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

function minutesAgo(date: Date | null, now: number) {
  if (!date) return 'just now';
  const mins = Math.round((now - date.getTime()) / 60000);
  return mins < 1 ? 'just now' : `${mins} min ago`;
}

const unicornIcon = (fresh: boolean) =>
  L.divIcon({
    className: '',
    html: `<div class="unicorn-pin${fresh ? ' fresh' : ''}"><span>🦄</span></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -18],
  });

export default function Map({ reports, theme, now }: { reports: Report[]; theme: Theme; now: number }) {
  const icons = useMemo(() => ({ fresh: unicornIcon(true), normal: unicornIcon(false) }), []);

  return (
    <MapContainer center={SYDNEY_CBD} zoom={14} className="map" zoomControl={false}>
      <TileLayer key={theme} url={TILES[theme]} attribution={ATTRIBUTION} subdomains="abcd" maxZoom={20} />
      <ZoomControl position="bottomright" />

      <TransitLines theme={theme} />

      {reports.map(report => {
        const ageMin = report.createdAt ? (now - report.createdAt.getTime()) / 60000 : 0;
        return (
          <Marker
            key={report.id}
            position={[report.lat, report.lng]}
            icon={ageMin < 5 ? icons.fresh : icons.normal}
            // Older reports fade out over the hour.
            opacity={Math.max(0.45, 1 - ageMin / 90)}
            zIndexOffset={1000}
          >
            <Popup>
              <strong>🦄 Inspector spotted</strong>
              <br />
              Reported {minutesAgo(report.createdAt, now)}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
