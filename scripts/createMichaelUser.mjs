import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyA_JDlAIzKDHuCFh4P5P8hlFL-3iCNtyO4',
  authDomain: 'manual-clinico.firebaseapp.com',
  projectId: 'manual-clinico',
  storageBucket: 'manual-clinico.firebasestorage.app',
  messagingSenderId: '127364027154',
  appId: '1:127364027154:web:442ff7eafc1f3750f659cb',
};

const TENANT_ID = 'clinicos_demo';
const EMAIL = 'michael@clinicos-demo.com';
const PASSWORD = 'Clinicos@2026';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createUser() {
  console.log('Autenticando...');
  await signInWithEmailAndPassword(auth, 'demo@clinicos.com', 'Demo@2026');

  console.log('Buscando informações do Dr. Michael Chen...');
  const staffRef = collection(db, 'bea_data', TENANT_ID, 'staff');
  const q = query(staffRef, where('email', '==', EMAIL));
  const snap = await getDocs(q);

  if (snap.empty) {
    console.error('Staff não encontrado para esse e-mail!');
    process.exit(1);
  }

  const staffDoc = snap.docs[0];
  const staffData = staffDoc.data();
  console.log(`Staff encontrado: ${staffData.name} (ID: ${staffDoc.id})`);

  let uid;
  try {
    const { user } = await createUserWithEmailAndPassword(auth, EMAIL, PASSWORD);
    uid = user.uid;
    await updateProfile(user, { displayName: staffData.name });
    console.log(`Auth user criado com UID: ${uid}`);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.error('Este e-mail já tem uma senha cadastrada no Firebase Auth.');
      process.exit(1);
    }
    throw err;
  }

  const userRef = doc(db, 'bea_data', TENANT_ID, 'users', uid);
  await setDoc(userRef, {
    uid,
    nome: staffData.name,
    email: EMAIL,
    role: 'veterinario', // Professional = veterinario
    crmv: staffData.professionalId || '',
    status: 'ativo',
    photoURL: null,
    staffId: staffDoc.id,
    createdAt: new Date().toISOString()
  });

  console.log('Perfil de usuário cadastrado com sucesso no banco de dados!');
  console.log('--- CREDENCIAIS CRIADAS ---');
  console.log(`Email: ${EMAIL}`);
  console.log(`Senha: ${PASSWORD}`);
  process.exit(0);
}

createUser().catch(console.error);
