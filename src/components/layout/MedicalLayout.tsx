import { Home, ClipboardList, Bed, Stethoscope, LogOut, ArrowLeft } from 'lucide-react';
import { AppUser } from '../../services/dataService';
import StockAlertsBanner from '../medical/StockAlertsBanner';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '../LanguageSelector';

interface Props {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  userProfile: AppUser | null;
  onLogout: () => void;
  children: React.ReactNode;
}

const MedicalLayout = ({ activeTab, setActiveTab, userProfile, onLogout, children }: Props) => {
  const { t } = useTranslation('common');
  
  const menuItems = [
    { id: 'dashboard', transKey: 'medical_nav.home', icon: Home },
    { id: 'consultas', transKey: 'medical_nav.consultations', icon: ClipboardList },
    { id: 'internacao', transKey: 'medical_nav.hospitalization', icon: Bed },
    { id: 'cirurgias', transKey: 'medical_nav.surgeries', icon: Stethoscope },
  ];

  return (
    <div className="h-screen w-screen bg-slate-900 flex overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 bg-teal-700 border-r border-teal-800 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-teal-800 flex items-center gap-3 bg-teal-800">
          <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold tracking-tight">{t('app_name')}</h1>
            <p className="text-[10px] text-teal-200 font-bold uppercase tracking-widest">{t('nav.medical_portal')}</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-teal-500 text-white font-bold shadow-lg shadow-teal-500/30' 
                    : 'text-teal-100 hover:bg-teal-600 hover:text-white font-medium border border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-teal-200'}`} />
                {t(item.transKey)}
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-teal-800">
          <div className="mb-4 px-2">
            <p className="text-xs text-teal-200 font-medium">Médico(a)</p>
            <p className="text-sm text-white font-bold truncate">Dr(a). {userProfile?.nome}</p>
          </div>
          {(userProfile?.role === 'administrador' || userProfile?.role === 'gerente') && (
            <button 
              onClick={() => window.location.href = '/?tab=monitoramento'}
              className="w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-xl text-teal-100 hover:bg-teal-600 transition-colors font-medium border border-transparent"
            >
              <ArrowLeft className="w-5 h-5 text-teal-200" />
              {t('auth.back_to_admin', { defaultValue: '← Voltar ao sistema' }).replace('← ', '')}
            </button>
          )}
          
          <div className="border-t border-teal-800 pt-3 mt-3">
            <LanguageSelector />
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 mt-2 rounded-xl text-teal-100 hover:bg-red-500/10 hover:text-red-400 transition-colors font-medium"
            >
              <LogOut className="w-5 h-5 text-teal-200 group-hover:text-red-400" />
              {t('medical_nav.logout')}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-900">
        <StockAlertsBanner />
        
        <div className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </div>
      </main>

    </div>
  );
};

export default MedicalLayout;
