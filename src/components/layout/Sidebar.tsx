import { Activity, LayoutDashboard, Users, Upload, Bot, LogOut, Shield, DollarSign, Settings, ShieldCheck, Calendar, Calculator, GitMerge, Package, Stethoscope } from 'lucide-react';
import { ActiveTab } from '../../App';
import { AppUser } from '../../services/dataService';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '../LanguageSelector';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  userProfile: AppUser | null;
  onLogout: () => void;
}

const navItems: { id: ActiveTab; transKey: string; icon: React.ElementType }[] = [
  { id: 'monitoramento', transKey: 'nav.monitoring',        icon: Activity },
  { id: 'agendamentos',  transKey: 'nav.appointments',      icon: Calendar },
  { id: 'pricing',       transKey: 'nav.pricing',           icon: Calculator },
  { id: 'products',      transKey: 'nav.products',          icon: Package },
  { id: 'reconciliation',transKey: 'nav.reconciliation',    icon: GitMerge },
  { id: 'caixa',         transKey: 'nav.cashier',           icon: DollarSign },
  { id: 'dashboard',     transKey: 'nav.dashboard',         icon: LayoutDashboard }, // using nav.dashboard if exists, else dashboard
  { id: 'crm',          transKey: 'nav.crm',               icon: Users },
  { id: 'importar',     transKey: 'import',                icon: Upload },
  { id: 'assistente',   transKey: 'nav.ai_assistant',      icon: Bot },
  { id: 'consultas',     transKey: 'nav.medical_portal',    icon: Stethoscope },
  { id: 'configuracoes', transKey: 'nav.settings',          icon: Settings },
  { id: 'admin',        transKey: 'nav.admin',             icon: ShieldCheck },
];

const Sidebar = ({ activeTab, setActiveTab, userProfile, onLogout }: SidebarProps) => {
  const { t } = useTranslation('common');
  return (
    <div className="w-64 flex-shrink-0 flex flex-col shadow-xl bg-teal-700">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-teal-800 flex justify-center items-center h-24 bg-teal-800">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-white" />
          <div>
            <span className="text-white font-bold text-xl tracking-wide flex items-center">ClinicOS</span>
            <p className="text-[10px] text-teal-200 font-bold uppercase tracking-widest text-center mt-1">Clinic Management</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.filter(item => {
          if (item.id === 'admin') {
            return userProfile?.email === 'lidianehoa@gmail.com';
          }
          if (item.id === 'dashboard' || item.id === 'importar' || item.id === 'consultas') {
            return userProfile?.role === 'gerente' || userProfile?.role === 'administrador';
          }
          return true;
        }).map(({ id, transKey, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => {
                if (id === 'consultas') {
                  window.location.href = '/medico?tab=dashboard';
                } else {
                  setActiveTab(id);
                }
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                  : 'text-teal-100 hover:bg-teal-600 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-teal-200'}`} />
              <span>{id === 'dashboard' ? 'Dashboard' : t(transKey)}</span>
            </button>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="px-4 py-4 border-t border-teal-800 space-y-4">
        {userProfile && (
          <div className="px-3 py-3 bg-teal-800 rounded-2xl border border-teal-600">
            <p className="text-white text-sm font-semibold truncate">{userProfile.nome}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Shield className="w-3 h-3 text-teal-300" />
              <p className="text-teal-200 text-[10px] uppercase font-bold tracking-wider">
                {userProfile.role}
              </p>
            </div>
          </div>
        )}
        
        <div className="border-t border-teal-800 pt-3 mt-3">
          <LanguageSelector />
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 mt-2 rounded-2xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>{t('nav.logout')}</span>
          </button>
        </div>

        <p className="text-teal-400 text-[10px] text-center pt-2">
          ClinicOS © 2026
        </p>
      </div>
    </div>
  );
};

export default Sidebar;
