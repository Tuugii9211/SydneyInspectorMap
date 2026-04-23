/**
 * Firestore Collection Schema: 'reports'
 * 
 * Each document:
 * {
 *   location: GeoPoint, // { latitude, longitude }
 *   timestamp: Timestamp, // server timestamp
 *   type: string, // e.g., 'inspector'
 *   status: string, // 'active' | 'expired'
 * }
 */

import firestore from '@react-native-firebase/firestore';

export interface Report {
  id?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: any;
  type: 'inspector';
}

export const submitReport = async (latitude: number, longitude: number) => {
  try {
    await firestore().collection('reports').add({
      location: new firestore.GeoPoint(latitude, longitude),
      timestamp: firestore.FieldValue.serverTimestamp(),
      type: 'inspector',
    });
  } catch (error) {
    console.error('Error submitting report:', error);
    throw error;
  }
};

export const subscribeToReports = (callback: (reports: Report[]) => void) => {
  return firestore()
    .collection('reports')
    .where('timestamp', '>', new Date(Date.now() - 60 * 60 * 1000)) // Last 60 minutes
    .onSnapshot(snapshot => {
      const reports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Report[];
      callback(reports);
    });
};
