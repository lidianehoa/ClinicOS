import { Activity, LayoutDashboard, Users, Upload, Bot, LogOut, Shield, DollarSign, Settings, ShieldCheck } from 'lucide-react';
import { ActiveTab } from '../../App';
import { AppUser } from '../../services/dataService';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  userProfile: AppUser | null;
  onLogout: () => void;
}

const navItems: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
  { id: 'monitoramento', label: 'Monitoramento',        icon: Activity },
  { id: 'caixa',         label: 'Caixa / PDV',          icon: DollarSign },
  { id: 'dashboard',     label: 'Dashboard',            icon: LayoutDashboard },
  { id: 'crm',          label: 'CRM Clientes',          icon: Users },
  { id: 'importar',     label: 'Importador de Dados',   icon: Upload },
  { id: 'assistente',   label: 'Assistente IA',         icon: Bot },
  { id: 'configuracoes', label: 'Configurações',         icon: Settings },
  { id: 'admin',        label: 'Admin (Auditoria)',    icon: ShieldCheck },
];

const Sidebar = ({ activeTab, setActiveTab, userProfile, onLogout }: SidebarProps) => {
  return (
    <div className="w-64 flex-shrink-0 flex flex-col shadow-xl" style={{ backgroundColor: '#1E1B4B' }}>
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10 flex justify-center items-center h-24">
        <img
          src="/favicon.svg"
          alt="ClinicOS"
          className="max-h-12 w-12 object-contain"
        />
        <span className="ml-3 text-white font-bold text-xl tracking-wide">ClinicOS</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.filter(item => {
          if (item.id === 'admin') {
            return userProfile?.email === 'lidianehoa@gmail.com';
          }
          if (item.id === 'dashboard' || item.id === 'importar') {
            return userProfile?.role === 'gerente' || userProfile?.role === 'administrador';
          }
          return true;
        }).map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'text-purple-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="px-4 py-4 border-t border-white/10 space-y-4">
        {userProfile && (
          <div className="px-3 py-3 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-white text-sm font-semibold truncate">{userProfile.nome}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Shield className="w-3 h-3 text-primary" />
              <p className="text-purple-300 text-[10px] uppercase font-bold tracking-wider">
                {userProfile.role}
              </p>
            </div>
          </div>
        )}
        
        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span>Sair</span>
        </button>

        <p className="text-purple-500 text-[10px] text-center pt-2">
          ClinicOS © 2026
        </p>
      </div>
    </div>
  );
};

export default Sidebar;
