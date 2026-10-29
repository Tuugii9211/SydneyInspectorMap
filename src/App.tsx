import { useEffect, useState } from 'react';
import Map from './components/Map';
import ReportButton from './components/ReportButton';
import { ConnectionStatus, Report, REPORT_TTL_MS, subscribeToReports, submitReport } from './services/reports';
import { useTheme } from './theme';

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
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const { theme, toggle } = useTheme();

  useEffect(() => subscribeToReports(setReports, setStatus), []);

  // Re-render every 30s so pins age out and "x min ago" stays current.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const live = reports.filter(r => !r.createdAt || now - r.createdAt.getTime() < REPORT_TTL_MS);

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
      setToast('🦄 Inspector reported. Thanks!');
    } catch (err) {
      console.error(err);
      setToast('Could not submit the report.');
      throw err;
    }
  };

  const statusText =
    status === 'connecting'
      ? 'Connecting…'
      : status === 'offline'
        ? 'Offline mode'
        : `${live.length} active report${live.length === 1 ? '' : 's'}`;

  return (
    <div className="app">
      <header className="app-header">
        <h1>🦄 Sydney Inspector Map</h1>
        <div className="header-right">
          <span className={`count ${status}`}>{statusText}</span>
          <button
            className="theme-toggle"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>
      <Map reports={live} theme={theme} now={now} />
      <ReportButton onReport={handleReport} disabled={status !== 'online'} />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
