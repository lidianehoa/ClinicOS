import React, { useState, useEffect, useMemo } from 'react';
import { 
  PawPrint, 
  Search, 
  Plus, 
  User, 
  Stethoscope, 
  Edit3, 
  Trash2, 
  X, 
  AlertCircle,
  ArrowRight,
  Cat,
  Dog
} from 'lucide-react';
import { 
  subscribePacientes, 
  subscribeResponsaveis, 
  savePaciente, 
  deletePaciente, 
  type Paciente, 
  type Responsavel, 
  type AppUser 
} from '../services/dataService';

interface AnimaisProps {
  userProfile?: AppUser | null;
  onOpenConsulta?: (pacienteId: string) => void;
  onNavigateToResponsavel?: () => void;
}

export default function Animais({ onOpenConsulta, onNavigateToResponsavel }: AnimaisProps) {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([]);
  const [search, setSearch] = useState('');
  const [filterEspecie, setFilterEspecie] = useState('todas');

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    especie: 'Canina',
    raca: '',
    sexo: 'Macho',
    idade: '',
    peso: '',
    tutorId: '',
    obito: false,
    dataObito: '',
    causaObito: '',
    convenio: 'particular' as 'particular' | 'petlove'
  });
  const [filtroConvenio, setFiltroConvenio] = useState<'todos' | 'particular' | 'petlove'>('todos');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativos' | 'obitos'>('todos');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const unsubPac = subscribePacientes(setPacientes);
    const unsubResp = subscribeResponsaveis(setResponsaveis);
    return () => {
      unsubPac();
      unsubResp();
    };
  }, []);

  // Map de TutorId -> Responsavel
  const responsaveisMap = useMemo(() => {
    const map = new Map<string, Responsavel>();
    responsaveis.forEach(r => map.set(r.id, r));
    return map;
  }, [responsaveis]);

  // Filtro de Animais por Nome, Espécie, Raça ou Nome do Tutor
  const filteredPacientes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pacientes.filter(p => {
      const tutor = responsaveisMap.get(p.tutorId);
      const tutorName = (tutor?.nomeCompleto || '').toLowerCase();
      const matchesText = !q || 
        (p.nome || '').toLowerCase().includes(q) || 
        (p.especie || '').toLowerCase().includes(q) || 
        (p.raca || '').toLowerCase().includes(q) ||
        tutorName.includes(q);

      const matchesEspecie = filterEspecie === 'todas' || 
        (p.especie || '').toLowerCase() === filterEspecie.toLowerCase();

      const matchesStatus =
        filtroStatus === 'todos' || (filtroStatus === 'obitos' ? !!p.obito : !p.obito);

      const matchesConvenio =
        filtroConvenio === 'todos' || (p.convenio || 'particular') === filtroConvenio;

      return matchesText && matchesEspecie && matchesStatus && matchesConvenio;
    })
    // Pacientes que vieram a óbito ficam no fim da lista
    .sort((a, b) => Number(!!a.obito) - Number(!!b.obito));
  }, [pacientes, search, filterEspecie, filtroStatus, filtroConvenio, responsaveisMap]);

  const totalObitos = useMemo(() => pacientes.filter(p => p.obito).length, [pacientes]);
  const totalPetlove = useMemo(() => pacientes.filter(p => p.convenio === 'petlove').length, [pacientes]);
  const fmtData = (iso?: string) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');

  const openNewModal = () => {
    setSelectedPaciente(null);
    setIsEditing(false);
    setFormError('');
    setFormData({
      nome: '',
      especie: 'Canina',
      raca: '',
      sexo: 'Macho',
      idade: '',
      peso: '',
      tutorId: responsaveis.length > 0 ? responsaveis[0].id : '',
      obito: false,
      dataObito: '',
      causaObito: '',
      convenio: 'particular'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p: Paciente, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedPaciente(p);
    setIsEditing(true);
    setFormError('');
    setFormData({
      nome: p.nome,
      especie: p.especie,
      raca: p.raca || '',
      sexo: p.sexo,
      idade: String(p.idade || ''),
      peso: String(p.peso || ''),
      tutorId: p.tutorId,
      obito: !!p.obito,
      dataObito: p.dataObito || '',
      causaObito: p.causaObito || '',
      convenio: p.convenio || 'particular'
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      setFormError('Por favor, informe o nome do animal.');
      return;
    }
    if (!formData.tutorId) {
      setFormError('É obrigatório vincular o animal a um Responsável cadastrado. Se o tutor ainda não existe, realize o cadastro do Responsável primeiro.');
      return;
    }

    setSaving(true);
    try {
      await savePaciente({
        id: selectedPaciente?.id,
        nome: formData.nome.trim(),
        especie: formData.especie,
        raca: formData.raca.trim() || 'SRD',
        sexo: formData.sexo,
        idade: formData.idade.trim() || '0',
        peso: Number(formData.peso) || 0,
        tutorId: formData.tutorId,
        criadoEm: selectedPaciente?.criadoEm || new Date().toISOString(),
        obito: formData.obito,
        dataObito: formData.dataObito,
        causaObito: formData.causaObito.trim(),
        convenio: formData.convenio
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar paciente', err);
      setFormError('Erro ao salvar paciente. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Deseja realmente remover o cadastro deste paciente?')) return;
    try {
      await deletePaciente(id);
    } catch (err) {
      console.error('Erro ao excluir paciente', err);
    }
  };

  const getSpeciesIcon = (especie: string) => {
    const esp = (especie || '').toLowerCase();
    if (esp.includes('felin') || esp.includes('gato')) return <Cat className="w-5 h-5 text-amber-500" />;
    if (esp.includes('canin') || esp.includes('cão') || esp.includes('cachorro')) return <Dog className="w-5 h-5 text-teal-600" />;
    return <PawPrint className="w-5 h-5 text-teal-600" />;
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-[1400px] mx-auto">
      {/* ── CABEÇALHO ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <PawPrint className="w-8 h-8 text-amber-500" />
            Animais (Pacientes)
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Prontuários e fichas clínicas dos pacientes ({pacientes.length} animais cadastrados).
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          {responsaveis.length === 0 && onNavigateToResponsavel && (
            <button
              onClick={onNavigateToResponsavel}
              className="px-4 py-2.5 rounded-xl border border-teal-500 text-teal-700 font-semibold text-sm hover:bg-teal-50 transition-colors flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Cadastrar Responsável Primeiro
            </button>
          )}

          <button
            onClick={openNewModal}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-600/30 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Animal
          </button>
        </div>
      </div>

      {/* ── FILTROS E BUSCA ────────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-96">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome do animal, raça ou tutor..."
            className="w-full bg-transparent border-none text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-0"
          />
        </div>

        {/* Abas de Espécie */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['todas', 'Canina', 'Felina', 'Equina', 'Ave'].map(esp => (
            <button
              key={esp}
              onClick={() => setFilterEspecie(esp)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                filterEspecie.toLowerCase() === esp.toLowerCase()
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {esp === 'todas' ? 'Todas Espécies' : esp}
            </button>
          ))}
          <span className="w-px h-5 bg-slate-200 mx-1" />
          {([['todos', 'Todos'], ['ativos', 'Ativos'], ['obitos', `Óbitos (${totalObitos})`]] as const).map(([k, rotulo]) => (
            <button
              key={k}
              onClick={() => setFiltroStatus(k)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                filtroStatus === k ? 'bg-slate-700 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {rotulo}
            </button>
          ))}
          <span className="w-px h-5 bg-slate-200 mx-1" />
          {([['todos', 'Particular + Petlove'], ['particular', 'Particular'], ['petlove', `Petlove (${totalPetlove})`]] as const).map(([k, rotulo]) => (
            <button
              key={k}
              onClick={() => setFiltroConvenio(k)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                filtroConvenio === k
                  ? k === 'petlove' ? 'bg-violet-600 text-white shadow-sm' : 'bg-pink-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      {/* ── GRID / LISTA DE ANIMAIS ────────────────────────────────────────── */}
      {filteredPacientes.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
          <PawPrint className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">Nenhum paciente encontrado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {search ? 'Nenhum resultado com os filtros atuais.' : 'Cadastre o primeiro paciente da clínica para liberar atendimentos, consultas e prontuário.'}
          </p>

          {responsaveis.length === 0 ? (
            <div className="mt-4 inline-flex flex-col items-center gap-2">
              <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-3 py-1 rounded-lg">
                É necessário ter ao menos um Responsável (tutor) cadastrado.
              </span>
              {onNavigateToResponsavel && (
                <button
                  onClick={onNavigateToResponsavel}
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors"
                >
                  Ir para Cadastro de Responsáveis
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={openNewModal}
              className="mt-4 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors"
            >
              Cadastrar Animal
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPacientes.map(p => {
            const tutor = responsaveisMap.get(p.tutorId);

            return (
              <div
                key={p.id}
                onClick={() => onOpenConsulta && onOpenConsulta(p.id)}
                className={`rounded-3xl p-5 border hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                  p.obito ? 'bg-slate-50 border-slate-300 hover:border-slate-400' : 'bg-white border-slate-200 hover:border-teal-400'
                }`}
              >
                {p.obito && (
                  <div className="absolute top-0 right-0 bg-slate-700 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-2xl">
                    Óbito{p.dataObito ? ` · ${fmtData(p.dataObito)}` : ''}
                  </div>
                )}
                {/* Linha Superior */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${p.obito ? 'bg-slate-200 border-slate-300 grayscale' : 'bg-amber-50 border-amber-200'}`}>
                        {getSpeciesIcon(p.especie)}
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-slate-800 group-hover:text-teal-700 transition-colors">
                          {p.nome}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          {p.especie} • {p.raca || 'SRD'}
                        </p>
                        <span
                          className={`inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            p.convenio === 'petlove'
                              ? 'bg-violet-100 text-violet-700 border border-violet-200'
                              : 'bg-pink-50 text-pink-700 border border-pink-200'
                          }`}
                        >
                          {p.convenio === 'petlove' ? 'Petlove Saúde' : 'Particular'}
                        </span>
                        {p.obito && p.causaObito && (
                          <p className="text-[11px] text-slate-500 italic mt-0.5">{p.causaObito}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => openEditModal(p, e)}
                        className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Editar Animal"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={e => handleDelete(p.id, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Excluir Animal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Informações Rápidas */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-center my-3">
                    <div className="bg-slate-50 rounded-xl py-1.5 px-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Sexo</span>
                      <span className="text-xs font-bold text-slate-700">{p.sexo}</span>
                    </div>
                    <div className="bg-slate-50 rounded-xl py-1.5 px-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Idade</span>
                      <span className="text-xs font-bold text-slate-700">{p.idade ? `${p.idade}` : '—'}</span>
                    </div>
                    <div className="bg-slate-50 rounded-xl py-1.5 px-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Peso</span>
                      <span className="text-xs font-bold text-slate-700">{p.peso ? `${p.peso} kg` : '—'}</span>
                    </div>
                  </div>

                  {/* Tutor Vinculado (Obrigatório) */}
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-teal-50/50 p-2.5 rounded-xl border border-teal-100">
                    <User className="w-4 h-4 text-teal-600 shrink-0" />
                    <div className="truncate">
                      <span className="text-[10px] uppercase font-bold text-teal-600 block">Tutor Responsável</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {tutor ? tutor.nomeCompleto : 'Tutor não encontrado'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ação de Abrir Consulta */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-teal-600 font-bold group-hover:underline flex items-center gap-1">
                    <Stethoscope className="w-3.5 h-3.5" />
                    {p.obito ? 'Ver prontuário' : 'Abrir Consulta'}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center transition-all text-slate-500">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: NOVO / EDITAR ANIMAL ────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <PawPrint className="w-5 h-5 text-amber-500" />
                {isEditing ? 'Editar Animal' : 'Novo Animal (Paciente)'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Tutor Selecionado (OBRIGATÓRIO) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Responsável (Tutor) *
                  </label>
                  {onNavigateToResponsavel && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        onNavigateToResponsavel();
                      }}
                      className="text-xs text-teal-600 font-bold hover:underline"
                    >
                      + Cadastrar novo Tutor
                    </button>
                  )}
                </div>

                {responsaveis.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Nenhum responsável cadastrado. Você precisa cadastrar um tutor antes de registrar um paciente.</span>
                  </div>
                ) : (
                  <select
                    value={formData.tutorId}
                    onChange={e => setFormData({ ...formData, tutorId: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                    required
                  >
                    <option value="" disabled>Selecione o tutor responsável...</option>
                    {responsaveis.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.nomeCompleto} {r.cpf ? `(CPF: ${r.cpf})` : ''} {r.telefone ? `• ${r.telefone}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Nome do Animal */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Nome do Paciente *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome do cão, gato ou pet..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none font-medium"
                  required
                />
              </div>

              {/* Espécie e Sexo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Espécie *
                  </label>
                  <select
                    value={formData.especie}
                    onChange={e => setFormData({ ...formData, especie: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white font-medium"
                  >
                    <option value="Canina">Canina</option>
                    <option value="Felina">Felina</option>
                    <option value="Equina">Equina</option>
                    <option value="Ave">Ave</option>
                    <option value="Réptil">Réptil</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Sexo *
                  </label>
                  <select
                    value={formData.sexo}
                    onChange={e => setFormData({ ...formData, sexo: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white font-medium"
                  >
                    <option value="Macho">Macho</option>
                    <option value="Fêmea">Fêmea</option>
                  </select>
                </div>
              </div>

              {/* Raça, Idade e Peso */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Raça
                  </label>
                  <input
                    type="text"
                    value={formData.raca}
                    onChange={e => setFormData({ ...formData, raca: e.target.value })}
                    placeholder="SRD / Raça"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Idade
                  </label>
                  <input
                    type="text"
                    value={formData.idade}
                    onChange={e => setFormData({ ...formData, idade: e.target.value })}
                    placeholder="Ex: 3 anos"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.peso}
                    onChange={e => setFormData({ ...formData, peso: e.target.value })}
                    placeholder="Ex: 12.5"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Forma de atendimento</label>
                <div className="grid grid-cols-2 gap-2">
                  {([['particular', 'Particular'], ['petlove', 'Petlove Saúde']] as const).map(([k, rotulo]) => (
                    <button
                      type="button"
                      key={k}
                      onClick={() => setFormData({ ...formData, convenio: k })}
                      className={`py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                        formData.convenio === k
                          ? k === 'petlove' ? 'bg-violet-600 text-white border-violet-600' : 'bg-pink-600 text-white border-pink-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {rotulo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.obito}
                    onChange={e => setFormData({ ...formData, obito: e.target.checked })}
                    className="w-4 h-4 accent-slate-700"
                  />
                  Paciente veio a óbito
                </label>
                {formData.obito && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Data do óbito</label>
                      <input
                        type="date"
                        value={formData.dataObito}
                        onChange={e => setFormData({ ...formData, dataObito: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Causa / observação</label>
                      <input
                        type="text"
                        value={formData.causaObito}
                        onChange={e => setFormData({ ...formData, causaObito: e.target.value })}
                        placeholder="Ex.: eutanásia, parvovirose"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || responsaveis.length === 0}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-teal-600 text-white hover:bg-teal-700 shadow-md shadow-teal-600/30 transition-all disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Cadastrar Paciente')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
