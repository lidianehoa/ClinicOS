import { useEffect, useState } from 'react';
import AppShell from './components/layout/AppShell';
import Monitoramento from './pages/Monitoramento';
import Caixa from './pages/Caixa';
import Dashboard from './pages/Dashboard';
import CRM from './pages/CRM';
import ImportadorDados from './pages/ImportadorDados';
import AssistenteIA from './pages/AssistenteIA';
import Configuracoes from './pages/Configuracoes';
import AdminConsole from './pages/AdminConsole.tsx';
import AIChat from './components/AIChat';
import Auth from './pages/Auth';
import PDVAutonomo from './pages/PDVAutonomo';
import { auth, onAuthStateChanged, signOut } from './services/firebase';
import { subscribeUserProfile as getUserProfile, type AppUser } from './services/dataService';

export type ActiveTab = 'monitoramento' | 'caixa' | 'dashboard' | 'crm' | 'importar' | 'assistente' | 'configuracoes' | 'admin';

function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('monitoramento');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);


  // Auth & Profile
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);

  // Sync tab with URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as ActiveTab;
    if (tab && ['monitoramento', 'caixa', 'dashboard', 'crm', 'importar', 'assistente', 'configuracoes', 'admin'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + `?tab=${tab}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  useEffect(() => {
    // 1. Escuta mudanças de autenticação
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setIsInitializing(false);
      }
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    // 2. Busca perfil no Firestore quando logado
    if (user?.uid) {
      const unsubProfile = getUserProfile(user.uid, (p) => {
        setProfile(p);
        setIsInitializing(false);
      });
      return () => unsubProfile();
    } else if (user === null) {
      setIsInitializing(false);
    }
  }, [user]);

  // A migração foi removida pois o banco de dados já está estabilizado.

  const handleNavigateToCRM = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setActiveTab('crm');
  };

  // ── Loading / migração ────────────────────────────────────────────────────
  if (isInitializing) {
    return (
      <div className="h-screen w-screen bg-base flex flex-col items-center justify-center space-y-6">
        <img src="/favicon.svg" alt="Logo" className="h-24 object-contain animate-pulse" />
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-white font-medium">
          Conectando ao sistema...
        </p>
      </div>
    );
  }

  // Se não estiver logado, mostra tela de Auth
  if (!user || !profile) {
    return <Auth />;
  }

  const handleLogout = () => signOut(auth);

  // ── MODO PDV AUTÔNOMO (SEM APPSHELL) ──────────────────────────────────────
  const isPdvMode = new URLSearchParams(window.location.search).get('mode') === 'pdv';
  if (isPdvMode) {
    return <PDVAutonomo userProfile={profile} />;
  }

  return (
    <AppShell 
      activeTab={activeTab} 
      setActiveTab={handleTabChange} 
      userProfile={profile}
      onLogout={handleLogout}
    >

      {activeTab === 'monitoramento' && (
        <Monitoramento 
          onNavigateToCRM={handleNavigateToCRM} 
          userProfile={profile}
        />
      )}
      {activeTab === 'caixa' && <Caixa userProfile={profile} />}
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'crm' && (
        <CRM
          selectedCustomerId={selectedCustomerId}
          setSelectedCustomerId={setSelectedCustomerId}
          userProfile={profile}
        />
      )}
      {activeTab === 'importar' && (
        <ImportadorDados 
          onNavigateToCRM={() => setActiveTab('crm')} 
          userProfile={profile}
        />
      )}
      {activeTab === 'assistente' && <AssistenteIA userProfile={profile} />}
      {activeTab === 'configuracoes' && <Configuracoes userProfile={profile} />}
      {activeTab === 'admin' && <AdminConsole userProfile={profile} />}
      <AIChat />
    </AppShell>
  );
}

export default App;
