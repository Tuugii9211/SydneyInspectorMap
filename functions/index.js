const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

/**
 * Scheduled function to delete reports older than 60 minutes.
 * Runs every 10 minutes.
 */
exports.cleanupOldReports = functions.pubsub.schedule('every 10 minutes').onRun(async (context) => {
  const firestore = admin.firestore();
  const sixtyMinutesAgo = admin.firestore.Timestamp.now().toMillis() - (60 * 60 * 1000);
  const cutoff = admin.firestore.Timestamp.fromMillis(sixtyMinutesAgo);

  const oldReportsQuery = firestore.collection('reports')
    .where('timestamp', '<', cutoff);

  const snapshot = await oldReportsQuery.get();
  
  if (snapshot.empty) {
    console.log('No old reports to delete.');
    return null;
  }

  const batch = firestore.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`Deleted ${snapshot.size} old reports.`);
  return null;
});
