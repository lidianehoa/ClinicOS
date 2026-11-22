const admin = require('firebase-admin');
admin.initializeApp({
  projectId: "crm-bea"
});
const db = admin.firestore();

async function run() {
  const casosRef = db.collectionGroup('casos_clinicos');
  const snapshot = await casosRef.get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.pacienteId || data.pacienteId === '') {
      console.log('Found orphan case:', doc.ref.path, 'Created at:', data.criadoEm);
      await doc.ref.delete();
      console.log('Deleted.');
    }
  }
}
run().catch(console.error);
