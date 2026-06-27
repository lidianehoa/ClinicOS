/**
 * createDemoUser.mjs
 * 
 * Creates the ClinicOS demo user in Firebase Auth and registers their profile
 * in Firestore with admin role so they can access all features.
 *
 * Usage:
 *   node scripts/createDemoUser.mjs
 *
 * Prerequisites:
 *   npm install firebase   (already installed as project dependency)
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
} from 'firebase/firestore';

// ── Same credentials as src/services/firebase.ts ──────────────────────────────
const firebaseConfig = {
  apiKey: 'AIzaSyA_JDlAIzKDHuCFh4P5P8hlFL-3iCNtyO4',
  authDomain: 'manual-clinico.firebaseapp.com',
  projectId: 'manual-clinico',
  storageBucket: 'manual-clinico.firebasestorage.app',
  messagingSenderId: '127364027154',
  appId: '1:127364027154:web:442ff7eafc1f3750f659cb',
};

const TENANT_ID = 'clinicos_demo';
const DEMO_EMAIL = 'demo@clinicos.com';
const DEMO_PASSWORD = 'Demo@2026';
const DEMO_NAME = 'Demo User';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createDemoUser() {
  console.log('🚀 ClinicOS — Creating demo user...\n');

  let uid;

  // ── 1. Create Auth user (or login if already exists) ──────────────────────
  try {
    const { user } = await createUserWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
    uid = user.uid;
    await updateProfile(user, { displayName: DEMO_NAME });
    console.log('✅ Firebase Auth user created');
    console.log(`   UID: ${uid}`);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.log('ℹ️  User already exists — signing in to get UID...');
      const { user } = await signInWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
      uid = user.uid;
      console.log(`   UID: ${uid}`);
    } else {
      throw err;
    }
  }

  // ── 2. Register user profile in Firestore with admin role ─────────────────
  const userRef = doc(db, 'bea_data', TENANT_ID, 'users', uid);
  await setDoc(userRef, {
    uid,
    email: DEMO_EMAIL,
    nome: DEMO_NAME,
    role: 'administrador',
    status: 'ativo',
    photoURL: null,
    createdAt: new Date().toISOString(),
  }, { merge: true });

  console.log('✅ Firestore user profile saved with role: administrador');
  console.log(`   Path: bea_data/${TENANT_ID}/users/${uid}`);

  console.log('\n─────────────────────────────────────────────');
  console.log('🎉 Demo user ready!');
  console.log(`   URL:      https://monitorbea.web.app`);
  console.log(`   Email:    ${DEMO_EMAIL}`);
  console.log(`   Password: ${DEMO_PASSWORD}`);
  console.log('─────────────────────────────────────────────\n');
  console.log('Next step: run  node scripts/seedDemoData.mjs');
  process.exit(0);
}

createDemoUser().catch((err) => {
  console.error('\n❌ Error:', err.code || err.message);
  process.exit(1);
});
