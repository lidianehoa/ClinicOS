import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  collection,
  getDocs,
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function listUsers() {
  console.log('Autenticando...');
  await signInWithEmailAndPassword(auth, 'demo@clinicos.com', 'Demo@2026');
  
  console.log('\n--- Usuários (com senha já criada) ---');
  const usersSnapshot = await getDocs(collection(db, 'bea_data', TENANT_ID, 'users'));
  if (usersSnapshot.empty) {
    console.log('Nenhum usuário encontrado.');
  } else {
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`- Nome: ${data.nome} | Email: ${data.email} | Nível: ${data.role}`);
    });
  }

  console.log('\n--- Equipe Autorizada (Staff) ---');
  const staffSnapshot = await getDocs(collection(db, 'bea_data', TENANT_ID, 'staff'));
  if (staffSnapshot.empty) {
    console.log('Nenhum membro da equipe encontrado.');
  } else {
    staffSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`- Nome: ${data.name} | Email: ${data.email} | Acesso: ${data.accessLevel} | ID Profissional: ${data.professionalId || 'N/A'}`);
    });
  }
  
  process.exit(0);
}

listUsers().catch(console.error);
