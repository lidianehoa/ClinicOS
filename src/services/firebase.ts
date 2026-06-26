import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyA_JDlAIzKDHuCFh4P5P8hlFL-3iCNtyO4",
  authDomain: "manual-clinico.firebaseapp.com",
  projectId: "manual-clinico",
  storageBucket: "manual-clinico.firebasestorage.app",
  messagingSenderId: "127364027154",
  appId: "1:127364027154:web:442ff7eafc1f3750f659cb",
  measurementId: "G-CN4Z5TGJWE"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

/**
 * Firestore com cache persistente (IndexedDB).
 *
 * persistentLocalCache + persistentMultipleTabManager:
 * - Dados ficam em disco → carregamento instantâneo nas visitas seguintes.
 * - O gerenciador de múltiplas abas evita writes duplicados/conflitantes
 *   entre abas do navegador, eliminando o risco de write-stream exhaustion.
 * - onSnapshot ainda mantém sincronização em tempo real com o servidor.
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export const storage = getStorage(app);

// Auth Methods
export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword
};
