/**
 * Firestore collection 'reports'. Each document:
 *   location:  GeoPoint
 *   timestamp: server Timestamp
 *   type:      'inspector'
 * Reports older than 60 minutes are hidden here and deleted by functions/index.js.
 */
import {
  addDoc,
  collection,
  GeoPoint,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';
import { getDb } from '../firebase';

export const REPORT_TTL_MS = 60 * 60 * 1000;

export type ConnectionStatus = 'connecting' | 'online' | 'offline';

export interface Report {
  id: string;
  lat: number;
  lng: number;
  createdAt: Date | null;
}

export async function submitReport(lat: number, lng: number) {
  const db = await getDb();
  if (!db) throw new Error('Firebase is not configured');
  await addDoc(collection(db, 'reports'), {
    location: new GeoPoint(lat, lng),
    timestamp: serverTimestamp(),
    type: 'inspector',
  });
}

export function subscribeToReports(
  onReports: (reports: Report[]) => void,
  onStatus: (status: ConnectionStatus) => void,
) {
  let unsubscribe = () => {};
  let cancelled = false;

  getDb().then(db => {
    if (cancelled) return;
    if (!db) {
      onStatus('offline');
      return;
    }
    const q = query(
      collection(db, 'reports'),
      where('timestamp', '>', Timestamp.fromMillis(Date.now() - REPORT_TTL_MS)),
    );
    unsubscribe = onSnapshot(
      q,
      snapshot => {
        onStatus('online');
        onReports(
          snapshot.docs.flatMap(doc => {
            const data = doc.data({ serverTimestamps: 'estimate' });
            const loc = data.location as GeoPoint | undefined;
            if (!loc) return [];
            return [
              {
                id: doc.id,
                lat: loc.latitude,
                lng: loc.longitude,
                createdAt: (data.timestamp as Timestamp | null)?.toDate() ?? null,
              },
            ];
          }),
        );
      },
      error => {
        console.error('Error subscribing to reports:', error);
        onStatus('offline');
      },
    );
  });

  return () => {
    cancelled = true;
    unsubscribe();
  };
}
