import { useEffect, useState } from 'react';
import AppShell from './components/layout/AppShell';
import Monitoramento from './pages/Monitoramento';
import Agendamentos from './pages/Agendamentos';
import Caixa from './pages/Caixa';
import Dashboard from './pages/Dashboard';
import CRM from './pages/CRM';
import ImportadorDados from './pages/ImportadorDados';
import AssistenteIA from './pages/AssistenteIA';
import Configuracoes from './pages/Configuracoes';
import AdminConsole from './pages/AdminConsole';
import Products from './pages/products/Products';
import AIChat from './components/AIChat';
import Auth from './pages/Auth';
import MedicalAuth from './pages/medico/MedicalAuth';
import MedicalLayout from './components/layout/MedicalLayout';
import MedicalDashboard from './pages/medico/MedicalDashboard';
import ConsultationsModule from './pages/medico/ConsultationsModule';
import HospitalizationsModule from './pages/medico/HospitalizationsModule';
import SurgeriesModule from './pages/medico/SurgeriesModule';
import Pricing from './pages/Pricing';
import Reconciliation from './pages/Reconciliation';
import PDVAutonomo from './pages/PDVAutonomo';
import { auth, onAuthStateChanged, signOut } from './services/firebase';
import { subscribeUserProfile as getUserProfile, type AppUser, getStaffByEmail, saveUserProfile } from './services/dataService';
import SetupGuide from './pages/SetupGuide';

export type ActiveTab = 'monitoramento' | 'agendamentos' | 'pricing' | 'products' | 'reconciliation' | 'caixa' | 'dashboard' | 'crm' | 'importar' | 'assistente' | 'configuracoes' | 'admin' | 'consultas' | 'internacao' | 'cirurgias';

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
    if (tab && ['monitoramento', 'agendamentos', 'pricing', 'products', 'reconciliation', 'caixa', 'dashboard', 'crm', 'importar', 'assistente', 'configuracoes', 'admin', 'consultas', 'internacao', 'cirurgias'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (window.location.pathname.startsWith('/medico')) {
      const newUrl = window.location.protocol + "//" + window.location.host + `/medico?tab=${tab}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
    } else {
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + `?tab=${tab}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
    }
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
      let resolved = false;

      // Safety timeout: se Firestore não responder em 10s (ex: erro QUIC/rede),
      // desbloqueamos o app. O usuário verá a tela de login novamente.
      const timeout = setTimeout(() => {
        if (!resolved) {
          console.warn('[App] Firestore profile fetch timed out — releasing initializing lock');
          setIsInitializing(false);
        }
      }, 10_000);

      const unsubProfile = getUserProfile(user.uid, (p) => {
        resolved = true;
        clearTimeout(timeout);
        if (p && !p.staffId) {
          getStaffByEmail(p.email).then(staffRecord => {
            if (staffRecord) {
              p.staffId = staffRecord.id;
              saveUserProfile({ ...p, staffId: staffRecord.id }).catch(console.error);
            }
          }).catch(console.error);
        }
        setProfile(p);
        setIsInitializing(false);
      });

      return () => {
        clearTimeout(timeout);
        unsubProfile();
      };
    } else if (user === null) {
      setIsInitializing(false);
    }
  }, [user]);

  // A migração foi removida pois o banco de dados já está estabilizado.

  const handleNavigateToCRM = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setActiveTab('crm');
  };

  // Rota /setup é pública — sem autenticação e sem loading
  if (window.location.pathname === '/setup') return <SetupGuide />;

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
    if (window.location.pathname === '/setup') return <SetupGuide />;
    if (window.location.pathname.startsWith('/medico')) return <MedicalAuth />;
    return <Auth />;
  }

  // REDIRECT LOGIC BASED ON ROLE
  if (user && profile) {
    const isMedicalRoute = window.location.pathname.startsWith('/medico');
    
    if (profile.role === 'veterinario' && !isMedicalRoute) {
      window.location.href = '/medico?tab=dashboard';
      return null;
    }
    
    if (profile.role !== 'veterinario' && profile.role !== 'administrador' && profile.role !== 'gerente' && isMedicalRoute) {
      window.location.href = '/?tab=monitoramento';
      return null;
    }
  }

  const handleLogout = () => signOut(auth);

  // ── MODO PDV AUTÔNOMO (SEM APPSHELL) ──────────────────────────────────────
  const isPdvMode = new URLSearchParams(window.location.search).get('mode') === 'pdv';
  if (isPdvMode && !window.location.pathname.startsWith('/medico')) {
    return <PDVAutonomo userProfile={profile} />;
  }

  // ── MODO PORTAL MÉDICO ────────────────────────────────────────────────────
  if (window.location.pathname.startsWith('/medico')) {
    return (
      <MedicalLayout
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        userProfile={profile}
        onLogout={handleLogout}
      >
        {activeTab === 'dashboard' && <MedicalDashboard userProfile={profile} />}
        {activeTab === 'consultas' && <ConsultationsModule userProfile={profile} />}
        {activeTab === 'internacao' && <HospitalizationsModule userProfile={profile} />}
        {activeTab === 'cirurgias' && <SurgeriesModule userProfile={profile} />}
      </MedicalLayout>
    );
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
      {activeTab === 'agendamentos' && <Agendamentos userProfile={profile} />}
      {activeTab === 'pricing' && <Pricing />}
      {activeTab === 'products' && <Products />}
      {activeTab === 'reconciliation' && <Reconciliation />}
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
