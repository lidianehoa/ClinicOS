import { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronRight, 
  Settings, 
  User, 
  Building, 
  Stethoscope,
  Save,
  Users,
  X,
  MapPin,
  Image as ImageIcon,
  Sliders,
  UserCheck,
  Globe,
  CheckCircle,
  Key,
  Receipt,
  AlertCircle,
  Bot,
  Sparkles,
  MessageCircle
} from 'lucide-react';
import { 
  saveUserProfile, type AppUser, 
  getFiscalConfig, saveFiscalConfig, type FiscalConfig, 
  getIntegrationsConfig, saveIntegrationsConfig, type IntegrationsConfig,
  getClinicConfig, saveClinicConfig, type ClinicConfig,
  subscribeServices, saveService, deleteService, type ClinicService,
  subscribeStaff, saveStaff, deleteStaff, type StaffMember
} from '../services/dataService';
import { useTranslation } from 'react-i18next';

const Configuracoes = ({ userProfile }: { userProfile: AppUser | null }) => {
  const { t } = useTranslation(['settings', 'common']);
  const [activeSection, setActiveSection] = useState('meu-perfil');
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('geral');

  // Perfil State
  const [nome, setNome] = useState(userProfile?.nome || '');
  const [crmv, setCrmv] = useState(userProfile?.crmv || '');
  const [loadingProfile, setLoadingProfile] = useState(false);

  const isAdmin = userProfile?.role === 'gerente' || userProfile?.role === 'administrador';

  // Fiscal State
  const [fiscalData, setFiscalData] = useState<FiscalConfig>({
    cnpj: '',
    razaoSocial: '',
    inscricaoEstadual: '',
    ambiente: 'homologacao',
    focusTokenHomologacao: '',
    focusTokenProducao: ''
  });
  const [isSavingFiscal, setIsSavingFiscal] = useState(false);
  const [msgFiscal, setMsgFiscal] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Integrations State
  const [integrationsData, setIntegrationsData] = useState<IntegrationsConfig>({ 
    geminiApiKey: '', 
    anthropicApiKey: '',
    evolutionApiUrl: '', 
    evolutionApiKey: '', 
    evolutionInstanceName: 'clinicos', 
    whatsappEnabled: false 
  });
  const [isSavingIntegrations, setIsSavingIntegrations] = useState(false);
  const [msgIntegrations, setMsgIntegrations] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Clinic State
  const [clinicData, setClinicData] = useState<ClinicConfig>({
    name: '', cnpj: '', phone: '', email: '', website: '',
    address: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' },
    businessHours: { open: '08:00', close: '18:00', days: { 'Seg': true, 'Ter': true, 'Qua': true, 'Qui': true, 'Sex': true, 'Sáb': false, 'Dom': false } },
    logoUrl: ''
  });
  const [isSavingClinic, setIsSavingClinic] = useState(false);
  const [msgClinic, setMsgClinic] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Services State
  const [services, setServices] = useState<ClinicService[]>([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<ClinicService | null>(null);

  // Staff State
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  useEffect(() => {
    if (userProfile) {
      setNome(userProfile.nome);
      setCrmv(userProfile.crmv || '');
    }
    
    // Load Fiscal Data
    if (isAdmin) {
      getFiscalConfig().then(data => {
        if (data) setFiscalData(data);
      });
      getIntegrationsConfig().then(data => {
        if (data) setIntegrationsData(data);
      });
      getClinicConfig().then(data => {
        if (data) setClinicData(data);
      });
    }
  }, [userProfile, isAdmin]);

  useEffect(() => {
    const unsubSrv = subscribeServices(setServices);
    const unsubStaff = subscribeStaff(setStaff);
    return () => { unsubSrv(); unsubStaff(); };
  }, []);

  const menuGroups = [
    ...(isAdmin ? [{
      title: 'Geral',
      items: [
        { id: 'empresa', label: 'Empresa', icon: Building },
        { id: 'filiais', label: 'Filiais', icon: Building },
      ]
    }] : []),
    {
      title: 'Atendimento',
      items: [
        { id: 'tipos-atendimento', label: 'Tipos de Atendimento', icon: Stethoscope },
      ]
    },
    {
      title: 'Segurança & Utilizadores',
      items: [
        { id: 'meu-perfil', label: 'O Meu Perfil / Senha', icon: User },
        { id: 'utilizadores', label: 'Utilizadores do Sistema', icon: Users },
        ...(isAdmin ? [{ id: 'fiscal', label: 'Fiscal / NFe', icon: Receipt }] : []),
        ...(isAdmin ? [{ id: 'integrations', label: 'Integrações', icon: Sparkles }] : []),
      ]
    }
  ];

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setLoadingProfile(true);
    try {
      await saveUserProfile({
        ...userProfile,
        nome,
        crmv: userProfile.role === 'veterinario' ? crmv : undefined
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  // ── Render Helpers ─────────────────────────────────────────────────────────

  const handleSaveClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingClinic(true);
    setMsgClinic(null);
    try {
      await saveClinicConfig(clinicData);
      setMsgClinic({ text: 'Dados da clínica salvos com sucesso!', type: 'success' });
    } catch (err) {
      console.error(err);
      setMsgClinic({ text: 'Erro ao salvar dados da clínica.', type: 'error' });
    } finally {
      setIsSavingClinic(false);
    }
  };

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setClinicData(prev => ({
            ...prev,
            address: {
              ...prev.address,
              logradouro: data.logradouro || prev.address.logradouro,
              bairro: data.bairro || prev.address.bairro,
              cidade: data.localidade || prev.address.cidade,
              estado: data.uf || prev.address.estado
            }
          }));
        }
      } catch (err) {
        console.error('Erro ao buscar CEP', err);
      }
    }
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    try {
      await saveStaff(editingStaff);
      setShowStaffModal(false);
      setEditingStaff(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar responsável');
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (window.confirm('Tem certeza que deseja inativar este responsável?')) {
      await deleteStaff(id);
    }
  };

  const renderResponsaveis = () => (
     <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm animate-fade-in">
        <div className="flex items-center justify-between mb-6">
           <h3 className="text-lg font-bold text-slate-800">Responsáveis e Colaboradores</h3>
           <button 
             onClick={() => {
               setEditingStaff({ id: '', name: '', role: '', professionalId: '', email: '', accessLevel: 'Professional', phone: '', status: 'Active', createdAt: new Date().toISOString() });
               setShowStaffModal(true);
             }}
             className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 shadow-sm transition-all text-sm"
           >
             <Plus className="w-4 h-4" />
             Adicionar
           </button>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Nome</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Cargo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Nível Acesso</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Situação</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {staff.map(member => (
                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-700">{member.name}</p>
                    <p className="text-[11px] text-slate-500">{member.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-700">{member.role}</p>
                    {member.professionalId && <p className="text-[11px] text-slate-500">Reg: {member.professionalId}</p>}
                  </td>
                  <td className="px-6 py-4">
                     <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                        member.accessLevel === 'Admin' ? 'bg-purple-100 text-purple-700' :
                        member.accessLevel === 'Manager' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                     }`}>
                       {member.accessLevel}
                     </span>
                  </td>
                  <td className="px-6 py-4">
                     <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${member.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                       {member.status === 'Active' ? 'Ativo' : 'Inativo'}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setEditingStaff(member); setShowStaffModal(true); }} className="p-2 text-slate-400 hover:text-primary hover:bg-purple-50 rounded-lg transition-all">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {member.status === 'Active' && (
                        <button onClick={() => handleDeleteStaff(member.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm">Nenhum responsável cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {showStaffModal && editingStaff && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">
                  {editingStaff.id ? 'Editar Responsável' : 'Novo Responsável'}
                </h3>
                <button type="button" onClick={() => setShowStaffModal(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <form onSubmit={handleSaveStaff} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Nome Completo*</label>
                    <input type="text" required value={editingStaff.name} onChange={e => setEditingStaff({...editingStaff, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Cargo*</label>
                    <input type="text" required value={editingStaff.role} onChange={e => setEditingStaff({...editingStaff, role: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm" placeholder="Ex: Veterinário" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Registro Profissional</label>
                    <input type="text" value={editingStaff.professionalId} onChange={e => setEditingStaff({...editingStaff, professionalId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm" placeholder="Ex: CRM-SP 12345" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Email*</label>
                    <input type="email" required value={editingStaff.email} onChange={e => setEditingStaff({...editingStaff, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Telefone</label>
                    <input type="text" value={editingStaff.phone} onChange={e => setEditingStaff({...editingStaff, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Nível de Acesso*</label>
                    <select value={editingStaff.accessLevel} onChange={e => setEditingStaff({...editingStaff, accessLevel: e.target.value as any})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm">
                      <option value="Professional">Profissional (Agenda/Prontuário)</option>
                      <option value="Receptionist">Recepção (Agenda/Caixa)</option>
                      <option value="Manager">Gerente (Relatórios/Equipe)</option>
                      <option value="Admin">Administrador (Acesso Total)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">Status</label>
                    <select value={editingStaff.status} onChange={e => setEditingStaff({...editingStaff, status: e.target.value as 'Active'|'Inactive'})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm">
                      <option value="Active">Ativo</option>
                      <option value="Inactive">Inativo</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowStaffModal(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancelar</button>
                  <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-sm shadow-emerald-500/20 flex items-center gap-2 transition-all">
                    <Save className="w-4 h-4" /> Salvar Responsável
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
     </div>
  );

  const renderEmpresa = () => (
    <div className="space-y-6 animate-fade-in pb-20">
      <h2 className="text-2xl font-bold text-slate-800">{t('settings:company_data', 'Dados da Empresa')}</h2>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {[
          { id: 'geral', label: 'Geral', icon: Building },
          { id: 'endereco', label: 'Endereço', icon: MapPin },
          { id: 'logomarca', label: 'Logomarca', icon: ImageIcon },
          { id: 'parametros', label: 'Parâmetros', icon: Sliders },
          { id: 'responsaveis', label: 'Responsáveis', icon: UserCheck },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative ${
              activeTab === tab.id ? 'text-primary' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'responsaveis' ? (
        renderResponsaveis()
      ) : activeTab === 'parametros' ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
          {renderPlaceholder('Parâmetros')}
        </div>
      ) : (
      <form onSubmit={handleSaveClinic} className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
        {activeTab === 'geral' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Nome da Clínica*</label>
              <input type="text" required value={clinicData.name} onChange={e => setClinicData({...clinicData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-700" placeholder="Nome Fantasia" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">CNPJ*</label>
              <input type="text" required value={clinicData.cnpj} onChange={e => setClinicData({...clinicData, cnpj: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-700" placeholder="XX.XXX.XXX/XXXX-XX" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Email de contato*</label>
              <input type="email" required value={clinicData.email} onChange={e => setClinicData({...clinicData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-700" placeholder="contato@clinica.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Telefone principal*</label>
              <input type="text" required value={clinicData.phone} onChange={e => setClinicData({...clinicData, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-700" placeholder="(00) 00000-0000" />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Site</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="url" value={clinicData.website} onChange={e => setClinicData({...clinicData, website: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-10 pr-3 text-sm" placeholder="https://" />
              </div>
            </div>

            <div className="md:col-span-2 space-y-1.5 mt-4">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Horário de funcionamento</label>
              <div className="flex items-center gap-4">
                <input type="time" value={clinicData.businessHours.open} onChange={e => setClinicData({...clinicData, businessHours: {...clinicData.businessHours, open: e.target.value}})} className="bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm" />
                <span className="text-slate-400">às</span>
                <input type="time" value={clinicData.businessHours.close} onChange={e => setClinicData({...clinicData, businessHours: {...clinicData.businessHours, close: e.target.value}})} className="bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm" />
              </div>
              <div className="flex gap-2 mt-3">
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
                  <label key={day} className="flex items-center gap-1 text-sm text-slate-600">
                    <input type="checkbox" checked={clinicData.businessHours.days[day]} onChange={e => setClinicData({...clinicData, businessHours: {...clinicData.businessHours, days: {...clinicData.businessHours.days, [day]: e.target.checked}}})} className="rounded text-primary focus:ring-primary" />
                    {day}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'endereco' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">CEP*</label>
              <input type="text" required value={clinicData.address.cep} onChange={e => setClinicData({...clinicData, address: {...clinicData.address, cep: e.target.value}})} onBlur={handleCepBlur} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm" placeholder="00000-000" />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Endereço*</label>
              <input type="text" required value={clinicData.address.logradouro} onChange={e => setClinicData({...clinicData, address: {...clinicData.address, logradouro: e.target.value}})} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm" placeholder="Rua / Avenida" />
            </div>
            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Número*</label>
              <input type="text" required value={clinicData.address.numero} onChange={e => setClinicData({...clinicData, address: {...clinicData.address, numero: e.target.value}})} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm" placeholder="123" />
            </div>
            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Complemento</label>
              <input type="text" value={clinicData.address.complemento} onChange={e => setClinicData({...clinicData, address: {...clinicData.address, complemento: e.target.value}})} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm" />
            </div>
            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Bairro*</label>
              <input type="text" required value={clinicData.address.bairro} onChange={e => setClinicData({...clinicData, address: {...clinicData.address, bairro: e.target.value}})} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm" />
            </div>
            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Cidade*</label>
              <input type="text" required value={clinicData.address.cidade} onChange={e => setClinicData({...clinicData, address: {...clinicData.address, cidade: e.target.value}})} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm" />
            </div>
            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Estado*</label>
              <input type="text" required maxLength={2} value={clinicData.address.estado} onChange={e => setClinicData({...clinicData, address: {...clinicData.address, estado: e.target.value.toUpperCase()}})} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm" placeholder="SP" />
            </div>
          </div>
        )}

        {activeTab === 'logomarca' && (
          <div className="space-y-6">
             <div className="flex items-center gap-6">
                <div className="w-32 h-32 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                   {clinicData.logoUrl ? (
                     <img src={clinicData.logoUrl} alt="Logo da Clínica" className="w-full h-full object-contain" />
                   ) : (
                     <ImageIcon className="w-10 h-10 text-slate-300" />
                   )}
                </div>
                <div className="space-y-2 flex-1">
                   <label className="text-[11px] font-bold text-slate-400 uppercase">URL da Imagem</label>
                   <input type="url" value={clinicData.logoUrl || ''} onChange={e => setClinicData({...clinicData, logoUrl: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm" placeholder="https://exemplo.com/logo.png" />
                   <p className="text-[10px] text-slate-400 mt-1">Cole a URL direta de uma imagem para usá-la como logotipo no sistema.</p>
                </div>
             </div>
          </div>
        )}

        {msgClinic && (
          <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 text-sm animate-in fade-in duration-300 ${
            msgClinic.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            {msgClinic.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {msgClinic.text}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
           <button type="submit" disabled={isSavingClinic} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 py-3 rounded-xl shadow-sm shadow-emerald-500/20 flex items-center gap-2 transition-all disabled:opacity-50">
             <Save className="w-5 h-5" />
             {isSavingClinic ? 'Salvando...' : 'Salvar Alterações'}
           </button>
        </div>
      </form>
      )}
    </div>
  );

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    try {
      await saveService(editingService);
      setShowServiceModal(false);
      setEditingService(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar serviço');
    }
  };

  const handleDeleteService = async (id: string) => {
    if (window.confirm('Tem certeza que deseja inativar este serviço?')) {
      await deleteService(id);
    }
  };

  const renderTiposAtendimento = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Serviços e Preços</h2>
        <button 
          onClick={() => {
            setEditingService({ id: '', name: '', category: 'Consulta', duration: 30, durationUnit: 'min', price: 0, description: '', status: 'Active', createdAt: new Date().toISOString() });
            setShowServiceModal(true);
          }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 shadow-sm transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nome</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Categoria</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Preço</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Situação</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {services.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-slate-700">{item.name}</span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{item.category}</td>
                <td className="px-6 py-4 text-sm font-medium text-slate-700">R$ {item.price.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${item.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {item.status === 'Active' ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => { setEditingService(item); setShowServiceModal(true); }} className="p-2 text-slate-400 hover:text-primary hover:bg-purple-50 rounded-lg transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {item.status === 'Active' && (
                      <button onClick={() => handleDeleteService(item.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {services.length === 0 && (
               <tr>
                 <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm">
                   Nenhum serviço cadastrado.
                 </td>
               </tr>
            )}
          </tbody>
        </table>
      </div>

      {showServiceModal && editingService && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">
                {editingService.id ? 'Editar Serviço' : 'Novo Serviço'}
              </h3>
              <button onClick={() => setShowServiceModal(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSaveService} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Nome do Serviço*</label>
                  <input type="text" required value={editingService.name} onChange={e => setEditingService({...editingService, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm" placeholder="Ex: Avaliação Inicial" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Categoria</label>
                  <select value={editingService.category} onChange={e => setEditingService({...editingService, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm">
                    <option>Consulta</option>
                    <option>Exame</option>
                    <option>Procedimento</option>
                    <option>Cirurgia</option>
                    <option>Outros</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Preço (R$)*</label>
                  <input type="number" step="0.01" min="0" required value={editingService.price} onChange={e => setEditingService({...editingService, price: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Duração Estimada*</label>
                  <div className="flex gap-2">
                    <input type="number" min="1" required value={editingService.duration} onChange={e => setEditingService({...editingService, duration: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm" />
                    <select value={editingService.durationUnit} onChange={e => setEditingService({...editingService, durationUnit: e.target.value as 'min'|'h'})} className="bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm">
                      <option value="min">min</option>
                      <option value="h">h</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Status</label>
                  <select value={editingService.status} onChange={e => setEditingService({...editingService, status: e.target.value as 'Active'|'Inactive'})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm">
                    <option value="Active">Ativo</option>
                    <option value="Inactive">Inativo</option>
                  </select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Descrição (Opcional)</label>
                  <textarea value={editingService.description} onChange={e => setEditingService({...editingService, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm h-24" placeholder="Detalhes do serviço..." />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowServiceModal(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-sm shadow-emerald-500/20 flex items-center gap-2 transition-all">
                  <Save className="w-4 h-4" /> Salvar Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderMeuPerfil = () => (
    <div className="animate-fade-in space-y-8">
      {/* Profile Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-slate-200 border-4 border-white shadow-sm overflow-hidden relative group">
            <div className="w-full h-full bg-slate-300 flex items-center justify-center text-slate-500">
              <User className="w-10 h-10" />
            </div>
            <button className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold uppercase">
              Alterar
            </button>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">{userProfile?.nome || 'Utilizador'}</h1>
            <p className="text-slate-500 font-medium capitalize">{userProfile?.role} da Clínica</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-primary hover:text-white transition-all shadow-sm"
          >
            {isEditing ? <X className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
          </button>
          <button className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all shadow-sm">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="max-w-xl bg-white rounded-3xl p-8 border border-slate-200 shadow-sm animate-in zoom-in-95 duration-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-primary" /> Editar Informações
          </h3>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Nome Completo</label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-700 focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {userProfile?.role === 'veterinario' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase">Registro Profissional</label>
                <input
                  type="text"
                  value={crmv}
                  onChange={e => setCrmv(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-700 focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}
            <button type="submit" disabled={loadingProfile} className="w-full bg-primary text-white font-bold py-3.5 rounded-xl mt-4 flex items-center justify-center gap-2">
              <Save className="w-4 h-4" />
              {loadingProfile ? 'Gravando...' : 'Guardar Alterações'}
            </button>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-teal-500 font-bold flex items-center gap-2">Dados básicos</h3>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Nome:</p>
                <p className="text-sm text-slate-700 font-medium">{userProfile?.nome}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">E-mail:</p>
                <p className="text-sm text-slate-700">{userProfile?.email}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Celular:</p>
                <p className="text-sm text-slate-700">—</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed pt-2 border-t border-slate-50">
              Este utilizador já fez o primeiro acesso. Agora, apenas ele pode alterar os seus dados pessoais.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-teal-500 font-bold flex items-center gap-2">Atendimento</h3>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Possui agenda de atendimentos:</p>
                <p className="text-sm text-slate-700 font-medium">{userProfile?.role === 'veterinario' ? 'Sim' : 'Não'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Escala de trabalho:</p>
                <p className="text-sm text-slate-700">Horário semanal fixo</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Horário de atendimento:</p>
                <p className="text-sm text-slate-700">Segunda a Sexta das 07:00 às 18:00</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-teal-500 font-bold flex items-center gap-2">Acesso ao sistema</h3>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Perfil de acesso:</p>
                <p className="text-sm text-slate-700 font-medium capitalize">{userProfile?.role} da Clínica</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Acesso ao sistema:</p>
                <span className="bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Acesso liberado</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Pode ver e alterar outras agendas:</p>
                <p className="text-sm text-slate-700">Sim</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const handleSaveFiscal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingFiscal(true);
    setMsgFiscal(null);
    try {
      await saveFiscalConfig(fiscalData);
      setMsgFiscal({ text: 'Configurações fiscais salvas com sucesso!', type: 'success' });
    } catch (err) {
      console.error(err);
      setMsgFiscal({ text: 'Erro ao salvar configurações fiscais.', type: 'error' });
    } finally {
      setIsSavingFiscal(false);
    }
  };

  const renderNFe = () => (
    <div className="space-y-8 animate-fade-in pb-20">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Configuração Fiscal e Emissão (Focus NFe)</h2>
        <p className="text-slate-500 mt-1">Insira os dados da clínica e os tokens da API Focus NFe para habilitar a emissão automática no Caixa.</p>
      </div>

      <form onSubmit={handleSaveFiscal} className="space-y-6">
        {/* Card 1: Dados da Empresa */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-50">
            <div className="p-2 bg-teal-50 rounded-lg text-teal-500">
              <Building className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-700">Dados Fiscais da Empresa</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Razão Social</label>
              <input 
                type="text" 
                value={fiscalData.razaoSocial}
                onChange={e => setFiscalData({...fiscalData, razaoSocial: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                placeholder="Nome Jurídico Completo"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">CNPJ</label>
              <input 
                type="text" 
                value={fiscalData.cnpj}
                onChange={e => setFiscalData({...fiscalData, cnpj: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                placeholder="00.000.000/0001-00"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Inscrição Estadual</label>
              <input 
                type="text" 
                value={fiscalData.inscricaoEstadual}
                onChange={e => setFiscalData({...fiscalData, inscricaoEstadual: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                placeholder="Isento ou Número"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Integração Focus NFe */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-50">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-500">
              <Key className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-700">Integração Focus NFe</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ambiente de Emissão</label>
              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => setFiscalData({...fiscalData, ambiente: 'homologacao'})}
                  className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    fiscalData.ambiente === 'homologacao' ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-inner' : 'bg-slate-50 border-slate-100 text-slate-400'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Homologação (Testes)
                </button>
                <button 
                  type="button"
                  onClick={() => setFiscalData({...fiscalData, ambiente: 'producao'})}
                  className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    fiscalData.ambiente === 'producao' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-inner' : 'bg-slate-50 border-slate-100 text-slate-400'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  Produção (Valor Fiscal)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-50">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Token Focus NFe (Homologação)</label>
                <input 
                  type="password" 
                  value={fiscalData.focusTokenHomologacao}
                  onChange={e => setFiscalData({...fiscalData, focusTokenHomologacao: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  placeholder="••••••••••••••••"
                />
                <p className="text-[10px] text-slate-400 italic">Você encontra este token no painel da Focus NFe em Painel API {'>'} Tokens.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Token Focus NFe (Produção)</label>
                <input 
                  type="password" 
                  value={fiscalData.focusTokenProducao}
                  onChange={e => setFiscalData({...fiscalData, focusTokenProducao: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  placeholder="••••••••••••••••"
                />
              </div>
            </div>
          </div>
        </div>

        {msgFiscal && (
          <div className={`p-4 rounded-xl flex items-center gap-3 text-sm animate-in fade-in duration-300 ${
            msgFiscal.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            {msgFiscal.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {msgFiscal.text}
          </div>
        )}

        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={isSavingFiscal}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-8 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {isSavingFiscal ? 'Salvando...' : 'Salvar Configurações Fiscais'}
          </button>
        </div>
      </form>
    </div>
  );

  const handleSaveIntegrations = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingIntegrations(true);
    setMsgIntegrations(null);
    try {
      await saveIntegrationsConfig(integrationsData);
      setMsgIntegrations({ text: 'Integrações salvas com sucesso!', type: 'success' });
    } catch (err) {
      console.error(err);
      setMsgIntegrations({ text: 'Erro ao salvar integrações.', type: 'error' });
    } finally {
      setIsSavingIntegrations(false);
    }
  };

  const renderIntegrations = () => (
    <div className="space-y-8 animate-fade-in pb-20">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Integrations</h2>
        <p className="text-slate-500 mt-1">Configure integrações de terceiros.</p>
      </div>

      <form onSubmit={handleSaveIntegrations} className="space-y-6">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-50">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-500">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-700">Google AI (Gemini)</h3>
            <span className={`px-2 py-1 rounded text-xs font-bold ml-auto ${integrationsData.geminiApiKey ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
              {integrationsData.geminiApiKey ? 'Active' : 'Not configured'}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Google GenAI API Key</label>
            <input 
              type="password" 
              value={integrationsData.geminiApiKey}
              onChange={e => setIntegrationsData({...integrationsData, geminiApiKey: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              placeholder="••••••••••••••••"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-50">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-500">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-700">Anthropic AI (Claude) - Leitura de Extratos</h3>
            <span className={`px-2 py-1 rounded text-xs font-bold ml-auto ${integrationsData.anthropicApiKey ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
              {integrationsData.anthropicApiKey ? 'Active' : 'Not configured'}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Anthropic API Key</label>
            <input 
              type="password" 
              value={integrationsData.anthropicApiKey || ''}
              onChange={e => setIntegrationsData({...integrationsData, anthropicApiKey: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              placeholder="sk-ant-api03-••••••••••••••••"
            />
            <p className="text-[10px] text-slate-400">Requerida para leitura inteligente de extratos bancários em PDF na Conciliação Bancária.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-50">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-500">
              <MessageCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-700">WhatsApp (Evolution API)</h3>
            <span className={`px-2 py-1 rounded text-xs font-bold ml-auto ${integrationsData.whatsappEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
              {integrationsData.whatsappEnabled ? 'Active' : 'Not configured'}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
             <div>
               <h4 className="text-sm font-bold text-slate-800">Ativar Notificações via WhatsApp</h4>
               <p className="text-xs text-slate-500">Habilita lembretes de consultas e confirmações automatizadas.</p>
             </div>
             <button
               type="button"
               onClick={() => setIntegrationsData({...integrationsData, whatsappEnabled: !integrationsData.whatsappEnabled})}
               className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${integrationsData.whatsappEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
             >
               <div className={`w-4 h-4 bg-white rounded-full absolute shadow-sm transition-transform ${integrationsData.whatsappEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
             </button>
          </div>

          {integrationsData.whatsappEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Instance URL</label>
                <input 
                  type="url" 
                  value={integrationsData.evolutionApiUrl || ''}
                  onChange={e => setIntegrationsData({...integrationsData, evolutionApiUrl: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  placeholder="https://sua-evolution-api.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">API Key (Global/Instance)</label>
                <input 
                  type="password" 
                  value={integrationsData.evolutionApiKey || ''}
                  onChange={e => setIntegrationsData({...integrationsData, evolutionApiKey: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  placeholder="••••••••••••••••"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Instance Name</label>
                <input 
                  type="text" 
                  value={integrationsData.evolutionInstanceName || ''}
                  onChange={e => setIntegrationsData({...integrationsData, evolutionInstanceName: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  placeholder="clinicos"
                />
              </div>
            </div>
          )}
        </div>

        {msgIntegrations && (
          <div className={`p-4 rounded-xl flex items-center gap-3 text-sm animate-in fade-in duration-300 ${
            msgIntegrations.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            {msgIntegrations.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {msgIntegrations.text}
          </div>
        )}

        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={isSavingIntegrations}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-8 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {isSavingIntegrations ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderPlaceholder = (title: string) => (
    <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 animate-fade-in">
      <Settings className="w-16 h-16 mb-4 opacity-20" />
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm">Esta funcionalidade será implementada brevemente.</p>
    </div>
  );

  return (
    <div className="flex h-full bg-slate-50 -m-6 lg:-m-8 min-h-screen">
      {/* Coluna Esquerda: Menu */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-sm fixed h-full">
        <div className="p-8 pb-6">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            Configurações
          </h1>
          <div className="mt-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar nas configurações..."
              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-8">
          {menuGroups.map((group, gIdx) => (
            <div key={gIdx} className="mb-6">
              <h3 className="px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                {group.title}
              </h3>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center justify-between px-6 py-3 text-sm font-medium transition-all rounded-xl ${
                      activeSection === item.id 
                        ? 'bg-purple-50 text-primary border-r-4 border-primary' 
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-4 h-4 ${activeSection === item.id ? 'text-primary' : 'text-slate-400'}`} />
                      {item.label}
                    </div>
                    <ChevronRight className={`w-3 h-3 transition-transform ${activeSection === item.id ? 'translate-x-1 opacity-100' : 'opacity-0'}`} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Coluna Direita: Conteúdo */}
      <div className="flex-1 ml-80 p-12 bg-white/30 overflow-y-auto">
        <div className="max-w-6xl">
          {activeSection === 'empresa' && renderEmpresa()}
          {activeSection === 'tipos-atendimento' && renderTiposAtendimento()}
          {activeSection === 'meu-perfil' && renderMeuPerfil()}
          {activeSection === 'fiscal' && renderNFe()}
          {activeSection === 'integrations' && renderIntegrations()}
          {activeSection === 'utilizadores' && renderResponsaveis()}
          {activeSection !== 'empresa' && activeSection !== 'tipos-atendimento' && activeSection !== 'meu-perfil' && activeSection !== 'fiscal' && activeSection !== 'integrations' && activeSection !== 'utilizadores' && renderPlaceholder(
            menuGroups.flatMap(g => g.items).find(i => i.id === activeSection)?.label || 'Configuração'
          )}
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;
