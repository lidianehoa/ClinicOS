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
  AlertCircle
} from 'lucide-react';
import { saveUserProfile, type AppUser, getFiscalConfig, saveFiscalConfig, type FiscalConfig } from '../services/dataService';

const Configuracoes = ({ userProfile }: { userProfile: AppUser | null }) => {
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
    }
  }, [userProfile, isAdmin]);

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

  const renderEmpresa = () => (
    <div className="space-y-6 animate-fade-in pb-20">
      <h2 className="text-2xl font-bold text-slate-800">Dados da Empresa</h2>

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

      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
        {activeTab === 'geral' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Tipo*</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-700">
                <option>Pessoa jurídica</option>
                <option>Pessoa física</option>
              </select>
            </div>
            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Nome Fantasia*</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-700" defaultValue="ClinicOS Demo" />
            </div>
            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Sigla*</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-700" defaultValue="CLINICOS" />
            </div>

            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">CNPJ*</label>
              <input type="text" className="w-full bg-slate-100 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-500" defaultValue="29.540.133/0001-32" disabled />
            </div>
            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Razão Social*</label>
              <input type="text" className="w-full bg-slate-100 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-500" defaultValue="L.S.PAHINS LTDA" disabled />
            </div>
            <div className="md:col-span-1 grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Inscrição Estadual</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-700" defaultValue="284284556" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Inscrição Municipal*</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-700" defaultValue="00241252000" />
              </div>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email comercial*</label>
              <input type="email" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-700" defaultValue="example@clinic.com" />
            </div>
            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Registro Profissional</label>
              <div className="flex gap-2">
                <select className="w-20 bg-slate-50 border border-slate-200 rounded-lg py-2 px-2 text-sm">
                  <option>MS</option>
                </select>
                <input type="text" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm" placeholder="Ex: 12345" />
              </div>
            </div>

            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Telefone comercial 1*</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm" defaultValue="(00) 00000-0000" />
            </div>
            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Telefone comercial 2</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm" defaultValue="" />
            </div>
            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Telefone comercial 3</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm" />
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Site</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-10 pr-3 text-sm" placeholder="http://" />
              </div>
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Redes Sociais</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm flex items-center gap-2">
                  <span className="bg-slate-300 text-slate-600 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                    https://clinicos.demo <X className="w-3 h-3 cursor-pointer" />
                  </span>
                  <input type="text" className="flex-1 bg-transparent focus:outline-none text-xs" placeholder="adicionar" />
                </div>
              </div>
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Horário de funcionamento</label>
              <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm h-32" defaultValue="24 HORAS"></textarea>
            </div>
          </div>
        )}

        {activeTab === 'endereco' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">CEP*</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm" defaultValue="79050-261" />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Endereço*</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm" defaultValue="Rua Spipe Calarge" />
            </div>
            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Número*</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm" defaultValue="2301" />
            </div>
            
            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Complemento</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm" />
            </div>
            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Ponto de referência</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm" />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Geolocalização</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm" />
            </div>

            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Bairro*</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm" defaultValue="VILA MORUMBI" />
            </div>
            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Cidade*</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm" defaultValue="Campo Grande" />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Estado*</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm">
                <option>Mato Grosso do Sul</option>
              </select>
            </div>
          </div>
        )}

        {(activeTab === 'logomarca' || activeTab === 'parametros' || activeTab === 'responsaveis') && (
           <div className="py-20 text-center text-slate-400">
             <Settings className="w-12 h-12 mx-auto mb-4 opacity-10" />
             <p className="text-sm">Aba {activeTab} disponível em breve.</p>
           </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-2 text-[10px] text-sky-600 bg-sky-50 px-3 py-1 rounded">
             <Settings className="w-3 h-3" />
             Atenção! Apenas os usuários que sairem do sistema e efetuarem o login novamente, visualizarão as alterações.
           </div>
           <button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-2 rounded shadow-sm flex items-center gap-2 transition-all">
             <CheckCircle className="w-4 h-4" />
             Salvar
           </button>
        </div>
      </div>
    </div>
  );

  const renderTiposAtendimento = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Tipos de Atendimento</h2>
        <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 shadow-sm transition-all text-sm">
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Descrição</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Situação</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {[
              { id: 1, descricao: 'Consulta', situacao: 'Ativo' },
              { id: 2, descricao: 'Consulta de Especialidade', situacao: 'Ativo' },
              { id: 3, descricao: 'Exame', situacao: 'Ativo' },
              { id: 4, descricao: 'Retorno', situacao: 'Ativo' },
              { id: 5, descricao: 'Vacina', situacao: 'Ativo' },
            ].map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-slate-700">{item.descricao}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[11px] font-bold">
                    {item.situacao}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 text-slate-400 hover:text-primary hover:bg-purple-50 rounded-lg transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
            <h3 className="text-sky-500 font-bold flex items-center gap-2">Dados básicos</h3>
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
            <h3 className="text-sky-500 font-bold flex items-center gap-2">Atendimento</h3>
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
            <h3 className="text-sky-500 font-bold flex items-center gap-2">Acesso ao sistema</h3>
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
            <div className="p-2 bg-sky-50 rounded-lg text-sky-500">
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
          {activeSection !== 'empresa' && activeSection !== 'tipos-atendimento' && activeSection !== 'meu-perfil' && activeSection !== 'fiscal' && renderPlaceholder(
            menuGroups.flatMap(g => g.items).find(i => i.id === activeSection)?.label || 'Configuração'
          )}
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;
