#!/usr/bin/env node
/**
 * provision-demo.mjs
 * Cria o usuário demo "demo.medico@clinicos.app" no Firebase Auth
 * e o perfil correspondente no Firestore (collection: artifacts/APP_ID/public/data/users).
 *
 * Uso: node scripts/provision-demo.mjs
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { initializeFirestore, doc, setDoc, persistentLocalCache } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA_JDlAIzKDHuCFh4P5P8hlFL-3iCNtyO4",
  authDomain: "manual-clinico.firebaseapp.com",
  projectId: "manual-clinico",
  storageBucket: "manual-clinico.firebasestorage.app",
  messagingSenderId: "127364027154",
  appId: "1:127364027154:web:442ff7eafc1f3750f659cb",
};

const DEMO_EMAIL    = 'demo.medico@clinicos.app';
const DEMO_PASSWORD = 'Demo@2025!';
const APP_ID        = 'clinicos_demo'; // mesmo valor do VITE_APP_TENANT_ID em produção

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = initializeFirestore(app, {});

async function run() {
  let uid;

  // 1. Tenta criar a conta; se já existir, faz login para pegar o UID
  try {
    const cred = await createUserWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
    uid = cred.user.uid;
    console.log(`✅ Conta criada: ${DEMO_EMAIL} (uid: ${uid})`);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      const cred = await signInWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
      uid = cred.user.uid;
      console.log(`ℹ️  Conta já existe. UID: ${uid}`);
    } else {
      throw err;
    }
  }

  // 2. Salva o perfil AppUser no Firestore
  const profileRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', uid);
  await setDoc(profileRef, {
    uid,
    nome: 'Dr. Demo',
    email: DEMO_EMAIL,
    role: 'veterinario',
    crmv: 'DEMO-0000',
    status: 'ativo',
    photoURL: null,
    staffId: null,
    isDemo: true,
    createdAt: new Date().toISOString(),
  }, { merge: true });

  console.log(`✅ Perfil Firestore salvo em artifacts/${APP_ID}/public/data/users/${uid}`);
  console.log('\n──────────────────────────────────────────────');
  console.log('  CREDENCIAIS DE ACESSO DEMO');
  console.log('  URL:   https://monitorbea.web.app/medico');
  console.log(`  Email: ${DEMO_EMAIL}`);
  console.log(`  Senha: ${DEMO_PASSWORD}`);
  console.log('──────────────────────────────────────────────\n');

  process.exit(0);
}

run().catch(err => {
  console.error('❌ Erro:', err.message || err);
  process.exit(1);
});
