import { LayoutDashboard, Users, Upload, LogOut, Shield, DollarSign, Settings, ShieldCheck, Calendar, GitMerge, Package, Stethoscope, PawPrint, History, ArrowDownCircle, ArrowUpCircle, PieChart, Briefcase, Calculator, ShoppingCart } from 'lucide-react';
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

type NavGroup = {
  label?: string;
  items: { id: ActiveTab; transKey: string; icon: React.ElementType; labelStr?: string }[];
};



const navGroups: NavGroup[] = [
  {
    items: [
      { id: 'dashboard',     transKey: 'nav.dashboard',         icon: LayoutDashboard },
    ]
  },
  {
    label: 'ATENDIMENTO',
    items: [
      { id: 'agendamentos',  transKey: 'nav.appointments',      icon: Calendar },
      { id: 'responsaveis',  transKey: '', labelStr: 'Responsáveis', icon: Users },
      { id: 'animais',       transKey: '', labelStr: 'Animais', icon: PawPrint },
      { id: 'consultas',     transKey: '', labelStr: 'Consulta', icon: Stethoscope },
      { id: 'historico',     transKey: '', labelStr: 'Histórico', icon: History },
    ]
  },
  {
    label: '',
    items: [
    ]
  },
  {
    label: 'FINANCEIRO',
    items: [
      { id: 'painel-financeiro', transKey: '',                  labelStr: 'Painel Financeiro', icon: PieChart },
      { id: 'precificacao',  transKey: '',                      labelStr: 'Precificação', icon: Calculator },
      { id: 'compras',       transKey: '',                      labelStr: 'Compras', icon: ShoppingCart },
      { id: 'caixa',         transKey: 'nav.cashier',           labelStr: 'Caixa', icon: DollarSign },
      { id: 'contas-receber',transKey: '',                      labelStr: 'Contas a Receber', icon: ArrowDownCircle },
      { id: 'contas-pagar',  transKey: '',                      labelStr: 'Contas a Pagar', icon: ArrowUpCircle },
      { id: 'reconciliation',transKey: 'nav.reconciliation',    labelStr: 'Conciliação Bancária', icon: GitMerge },
    ]
  },
  {
    label: 'CADASTROS',
    items: [
      { id: 'products',      transKey: 'nav.products',          labelStr: 'Produtos', icon: Package },
      { id: 'servicos',      transKey: '',                      labelStr: 'Serviços', icon: Briefcase },
      { id: 'importar',      transKey: 'import',                icon: Upload },
    ]
  },
  {
    label: 'SISTEMA',
    items: [
      { id: 'configuracoes', transKey: 'nav.settings',          icon: Settings },
      { id: 'admin',         transKey: 'nav.admin',             icon: ShieldCheck },
    ]
  }
];

const Sidebar = ({ activeTab, setActiveTab, userProfile, onLogout }: SidebarProps) => {
  const { t } = useTranslation('common');
  return (
    <div className="w-64 flex-shrink-0 flex flex-col shadow-xl bg-teal-700 h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-teal-800 bg-teal-800 flex-shrink-0">
        <div className="bg-[#FBF7EE] rounded-2xl px-3 py-2 shadow-inner ring-1 ring-pink-300/60">
          <img
            src="/logo-dra-lidiane.png"
            alt="Dra. Lidiane — Médica Veterinária"
            className="w-full h-24 object-contain"
          />
        </div>
        <p className="text-[10px] text-pink-200 font-bold uppercase tracking-widest text-center mt-2">ClinicOS · Gestão Veterinária</p>
      </div>

      {/* Nav Content */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {navGroups.map((group, groupIndex) => {
          const visibleItems = group.items.filter(item => {
            if (item.id === 'admin') {
              return userProfile?.email === 'lidianehoa@gmail.com';
            }
            if (item.id === 'importar') {
              return userProfile?.role === 'gerente' || userProfile?.role === 'administrador';
            }
            return true;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={groupIndex} className="space-y-1">
              {group.label && (
                <div className="px-4 mb-2">
                  <span className="text-[10px] font-black tracking-widest text-teal-300/70 uppercase">
                    {group.label}
                  </span>
                </div>
              )}
              {visibleItems.map(({ id, transKey, icon: Icon, labelStr }) => {
                const isActive = activeTab === id;
                const isAI = id === 'assistente';

                if (isAI) {
                  return (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 mt-2 mb-2 rounded-2xl text-sm font-bold transition-all duration-300 overflow-hidden relative group ${
                        isActive
                          ? 'text-white shadow-lg shadow-teal-900/50 scale-[1.02]'
                          : 'text-teal-50 hover:text-white hover:scale-[1.02]'
                      }`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-r ${isActive ? 'from-amber-500 to-orange-400' : 'from-teal-600 to-teal-500 group-hover:from-teal-500 group-hover:to-teal-400'} rounded-2xl`} />
                      <Icon className={`w-5 h-5 flex-shrink-0 relative z-10 ${isActive ? 'text-white' : 'text-amber-300'}`} />
                      <span className="relative z-10">{labelStr}</span>
                      {!isActive && <span className="absolute right-4 top-1/2 -translate-y-1/2 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>}
                    </button>
                  );
                }

                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                        : 'text-teal-100 hover:bg-teal-600 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-teal-200'}`} />
                    <span>{labelStr || (id === 'dashboard' ? 'Dashboard' : t(transKey))}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User, Tenant & Logout */}
      <div className="px-4 py-4 border-t border-teal-800 space-y-3 bg-teal-800/30 flex-shrink-0">
        {userProfile && (
          <div className="px-3 py-2.5 bg-teal-800 rounded-2xl border border-teal-600 space-y-2">
            <div>
              <p className="text-white text-sm font-semibold truncate">{userProfile.nome}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Shield className="w-3 h-3 text-teal-300" />
                <p className="text-teal-200 text-[10px] uppercase font-bold tracking-wider">
                  {userProfile.role}
                </p>
              </div>
            </div>

            {/* Tenant / Clínica info e switcher */}
            <div className="pt-2 border-t border-teal-700/60 flex flex-col gap-1">
              <span className="text-[9px] font-bold text-teal-300/80 uppercase tracking-wider">Unidade / Clínica</span>
              {userProfile.tenants && userProfile.tenants.length > 1 ? (
                <select
                  value={userProfile.activeTenantId || userProfile.tenants[0]}
                  onChange={async (e) => {
                    const newTenant = e.target.value;
                    const { setActiveTenantId, saveUserProfile } = await import('../../services/dataService');
                    setActiveTenantId(newTenant);
                    await saveUserProfile({ ...userProfile, activeTenantId: newTenant });
                    window.location.reload();
                  }}
                  className="w-full bg-teal-900 border border-teal-600 text-teal-100 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-400"
                >
                  {userProfile.tenants.map((tId) => (
                    <option key={tId} value={tId} className="bg-teal-900 text-white">
                      {tId}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs text-white/90 font-medium truncate">
                  {userProfile.clinicName || userProfile.activeTenantId || 'Unidade Principal'}
                </span>
              )}
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

        <p className="text-teal-300 text-[10px] text-center pt-2 leading-snug">
          © {new Date().getFullYear()} · Tecnologia desenvolvida por<br />
          <span className="text-pink-300 font-semibold">Lidiane Helena – DUOVET</span>
        </p>
      </div>
    </div>
  );
};

export default Sidebar;
