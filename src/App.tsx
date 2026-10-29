import { useEffect, useState } from 'react';
import Map from './components/Map';
import ReportButton from './components/ReportButton';
import { isFirebaseReady, Report, subscribeToReports, submitReport } from './services/reports';

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000,
    });
  });
}

export default function App() {
  const [reports, setReports] = useState<Report[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const firebaseReady = isFirebaseReady();

  useEffect(() => subscribeToReports(setReports), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleReport = async () => {
    let position: GeolocationPosition;
    try {
      position = await getPosition();
    } catch (err) {
      const denied = (err as GeolocationPositionError).code === 1;
      setToast(denied ? 'Location access is needed to submit a report.' : 'Could not get your location. Try again.');
      throw err;
    }
    try {
      await submitReport(position.coords.latitude, position.coords.longitude);
      setToast('Inspector report submitted. Thanks!');
    } catch (err) {
      console.error(err);
      setToast('Could not submit the report.');
      throw err;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Sydney Inspector Map</h1>
        <span className="count">
          {firebaseReady ? `${reports.length} active report${reports.length === 1 ? '' : 's'}` : 'Offline mode'}
        </span>
      </header>
      <Map reports={reports} />
      <ReportButton onReport={handleReport} disabled={!firebaseReady} />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
