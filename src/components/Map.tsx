import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from 'react-leaflet';
import type { Feature, FeatureCollection, LineString } from 'geojson';
import transportLines from '../data/transportLines.json';
import type { Report } from '../services/reports';

const SYDNEY_CBD: [number, number] = [-33.8688, 151.2093];

type LineFeature = Feature<LineString, { name: string; color: string }>;
const lines = (transportLines as FeatureCollection).features as LineFeature[];

function minutesAgo(date: Date | null) {
  if (!date) return 'just now';
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  return mins < 1 ? 'just now' : `${mins} min ago`;
}

export default function Map({ reports }: { reports: Report[] }) {
  return (
    <MapContainer center={SYDNEY_CBD} zoom={14} className="map" zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {lines.map(line => (
        <Polyline
          key={line.properties.name}
          positions={line.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number])}
          pathOptions={{ color: line.properties.color, weight: 4 }}
        />
      ))}

      {reports.map(report => (
        <CircleMarker
          key={report.id}
          center={[report.lat, report.lng]}
          radius={10}
          pathOptions={{ color: '#fff', weight: 2, fillColor: '#ff4444', fillOpacity: 0.9 }}
        >
          <Popup>
            <strong>Transport inspector</strong>
            <br />
            Reported {minutesAgo(report.createdAt)}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
