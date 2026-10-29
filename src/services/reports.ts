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
import { db } from '../firebase';

export const REPORT_TTL_MS = 60 * 60 * 1000;

export interface Report {
  id: string;
  lat: number;
  lng: number;
  createdAt: Date | null;
}

export const isFirebaseReady = () => db !== null;

export async function submitReport(lat: number, lng: number) {
  if (!db) throw new Error('Firebase is not configured');
  await addDoc(collection(db, 'reports'), {
    location: new GeoPoint(lat, lng),
    timestamp: serverTimestamp(),
    type: 'inspector',
  });
}

export function subscribeToReports(callback: (reports: Report[]) => void) {
  if (!db) return () => {};

  const q = query(
    collection(db, 'reports'),
    where('timestamp', '>', Timestamp.fromMillis(Date.now() - REPORT_TTL_MS)),
  );

  return onSnapshot(
    q,
    snapshot => {
      callback(
        snapshot.docs.map(doc => {
          const data = doc.data();
          const loc = data.location as GeoPoint;
          return {
            id: doc.id,
            lat: loc.latitude,
            lng: loc.longitude,
            createdAt: (data.timestamp as Timestamp | null)?.toDate() ?? null,
          };
        }),
      );
    },
    error => console.error('Error subscribing to reports:', error),
  );
}
