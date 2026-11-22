import React, { useState, useEffect, useMemo } from 'react';
import { linkWhatsApp } from '../utils/whatsapp';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  PawPrint, 
  Edit3, 
  Trash2, 
  X, 
  ChevronRight,
  ExternalLink,
  MessageCircle
} from 'lucide-react';
import { 
  subscribeResponsaveis, 
  saveResponsavel, 
  deleteResponsavel, 
  subscribePacientes, 
  savePaciente,
  type Responsavel, 
  type Paciente, 
  type AppUser 
} from '../services/dataService';

interface ResponsaveisProps {
  userProfile?: AppUser | null;
  onNavigateToAnimal?: (pacienteId: string) => void;
  onOpenConsulta?: (pacienteId: string) => void;
}

export default function Responsaveis({ onNavigateToAnimal, onOpenConsulta }: ResponsaveisProps) {
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [search, setSearch] = useState('');
  
  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedResp, setSelectedResp] = useState<Responsavel | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Modal de adicionar animal direto para o tutor
  const [isAddAnimalModalOpen, setIsAddAnimalModalOpen] = useState(false);
  const [newAnimalNome, setNewAnimalNome] = useState('');
  const [newAnimalEspecie, setNewAnimalEspecie] = useState('Canina');
  const [newAnimalRaca, setNewAnimalRaca] = useState('');
  const [newAnimalSexo, setNewAnimalSexo] = useState('Macho');
  const [newAnimalIdade, setNewAnimalIdade] = useState('');
  const [newAnimalPeso, setNewAnimalPeso] = useState('');

  // Form Responsável
  const [formData, setFormData] = useState({
    nomeCompleto: '',
    cpf: '',
    telefone: '',
    email: '',
    endereco: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubResp = subscribeResponsaveis(setResponsaveis);
    const unsubPac = subscribePacientes(setPacientes);
    return () => {
      unsubResp();
      unsubPac();
    };
  }, []);

  // Filtro de Busca por nome ou CPF
  const filteredResponsaveis = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return responsaveis;
    return responsaveis.filter(r => 
      (r.nomeCompleto || '').toLowerCase().includes(q) || 
      (r.cpf || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''))
    );
  }, [responsaveis, search]);

  const openNewModal = () => {
    setSelectedResp(null);
    setIsEditing(false);
    setFormData({
      nomeCompleto: '',
      cpf: '',
      telefone: '',
      email: '',
      endereco: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (resp: Responsavel) => {
    setSelectedResp(resp);
    setIsEditing(true);
    setFormData({
      nomeCompleto: resp.nomeCompleto,
      cpf: resp.cpf,
      telefone: resp.telefone,
      email: resp.email,
      endereco: resp.endereco || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nomeCompleto.trim()) return;
    setSaving(true);
    try {
      await saveResponsavel({
        id: selectedResp?.id,
        nomeCompleto: formData.nomeCompleto.trim(),
        cpf: formData.cpf.trim(),
        telefone: formData.telefone.trim(),
        email: formData.email.trim(),
        endereco: formData.endereco.trim(),
        criadoEm: selectedResp?.criadoEm || new Date().toISOString()
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar responsável', err);
      alert('Erro ao salvar responsável. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente remover este responsável?')) return;
    try {
      await deleteResponsavel(id);
      if (selectedResp?.id === id) {
        setSelectedResp(null);
      }
    } catch (err) {
      console.error('Erro ao excluir responsável', err);
    }
  };

  // Salvar novo animal direto no perfil do tutor
  const handleSaveAnimal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResp || !newAnimalNome.trim()) return;
    setSaving(true);
    try {
      await savePaciente({
        nome: newAnimalNome.trim(),
        especie: newAnimalEspecie,
        raca: newAnimalRaca.trim() || 'SRD',
        sexo: newAnimalSexo,
        idade: newAnimalIdade.trim() || '0',
        peso: Number(newAnimalPeso) || 0,
        tutorId: selectedResp.id,
        criadoEm: new Date().toISOString()
      });
      setIsAddAnimalModalOpen(false);
      setNewAnimalNome('');
      setNewAnimalRaca('');
      setNewAnimalIdade('');
      setNewAnimalPeso('');
    } catch (err) {
      console.error('Erro ao salvar animal', err);
    } finally {
      setSaving(false);
    }
  };

  // Animais do tutor selecionado
  const tutorAnimals = useMemo(() => {
    if (!selectedResp) return [];
    return pacientes.filter(p => p.tutorId === selectedResp.id);
  }, [selectedResp, pacientes]);

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-[1400px] mx-auto">
      {/* ── CABEÇALHO ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Users className="w-8 h-8 text-teal-600" />
            Responsáveis
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestão e cadastro de tutores da clínica ({responsaveis.length} cadastrados).
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-600/30 transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Novo Responsável
        </button>
      </div>

      {/* ── BARRA DE BUSCA ─────────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome do tutor ou CPF..."
          className="w-full bg-transparent border-none text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-0"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs text-slate-400 hover:text-slate-600">
            Limpar
          </button>
        )}
      </div>

      {/* ── LISTA E DETALHE (LAYOUT DIVIDIDO) ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Coluna da Lista */}
        <div className={`space-y-3 ${selectedResp ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
          {filteredResponsaveis.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">Nenhum responsável encontrado</h3>
              <p className="text-xs text-slate-500 mt-1">
                {search ? 'Tente ajustar os termos da sua pesquisa.' : 'Cadastre o primeiro tutor clicando em "Novo Responsável".'}
              </p>
              {!search && (
                <button
                  onClick={openNewModal}
                  className="mt-4 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors"
                >
                  Cadastrar Responsável
                </button>
              )}
            </div>
          ) : (
            filteredResponsaveis.map(resp => {
              const respAnimals = pacientes.filter(p => p.tutorId === resp.id);
              const isSelected = selectedResp?.id === resp.id;

              return (
                <div
                  key={resp.id}
                  onClick={() => setSelectedResp(resp)}
                  className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-sm hover:shadow-md flex items-center justify-between gap-4 ${
                    isSelected 
                      ? 'border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/20' 
                      : 'border-slate-200 hover:border-teal-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-teal-100 text-teal-700 font-bold flex items-center justify-center shrink-0">
                      {resp.nomeCompleto.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-800 truncate">
                        {resp.nomeCompleto}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-slate-500">
                        {resp.cpf && <span>CPF: {resp.cpf}</span>}
                        {resp.telefone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {resp.telefone}
                            {linkWhatsApp(resp.telefone) && (
                              <a
                                href={linkWhatsApp(resp.telefone)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                title="Abrir conversa no WhatsApp"
                                className="ml-1 inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100"
                              >
                                <MessageCircle className="w-3 h-3" /> WhatsApp
                              </a>
                            )}
                          </span>
                        )}
                        {resp.email && (
                          <span className="flex items-center gap-1 truncate max-w-[180px]">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {resp.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-600">
                      <PawPrint className="w-3.5 h-3.5 text-amber-500" />
                      <span>{respAnimals.length} {respAnimals.length === 1 ? 'animal' : 'animais'}</span>
                    </div>

                    <ChevronRight className={`w-5 h-5 transition-transform ${isSelected ? 'text-teal-600 translate-x-0.5' : 'text-slate-300'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Coluna de Detalhe e Animais do Tutor (quando selecionado) */}
        {selectedResp && (
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6 sticky top-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-teal-600 text-white font-bold text-lg flex items-center justify-center">
                  {selectedResp.nomeCompleto.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">{selectedResp.nomeCompleto}</h2>
                  <p className="text-xs text-slate-400">Cadastrado em {new Date(selectedResp.criadoEm).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(selectedResp)}
                  className="p-2 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-xl transition-colors"
                  title="Editar Responsável"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(selectedResp.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  title="Remover"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedResp(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Informações de Contato */}
            <div className="space-y-2.5 text-xs text-slate-600">
              {selectedResp.cpf && (
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">CPF:</span>
                  <span className="font-semibold text-slate-800">{selectedResp.cpf}</span>
                </div>
              )}
              {selectedResp.telefone && (
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Telefone:</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-2">
                    {selectedResp.telefone}
                    {linkWhatsApp(selectedResp.telefone) && (
                      <a
                        href={linkWhatsApp(selectedResp.telefone)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> Abrir no WhatsApp
                      </a>
                    )}
                  </span>
                </div>
              )}
              {selectedResp.email && (
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">E-mail:</span>
                  <span className="font-semibold text-slate-800">{selectedResp.email}</span>
                </div>
              )}
              {selectedResp.endereco && (
                <div className="flex items-start justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium shrink-0">Endereço:</span>
                  <span className="font-semibold text-slate-800 text-right">{selectedResp.endereco}</span>
                </div>
              )}
            </div>

            {/* Lista de Animais Vinculados */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <PawPrint className="w-4 h-4 text-amber-500" />
                  Animais Vinculados ({tutorAnimals.length})
                </h3>
                <button
                  onClick={() => setIsAddAnimalModalOpen(true)}
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Novo Animal
                </button>
              </div>

              {tutorAnimals.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
                  <p className="text-xs text-slate-500">Nenhum animal cadastrado para este tutor ainda.</p>
                  <button
                    onClick={() => setIsAddAnimalModalOpen(true)}
                    className="mt-2 text-xs font-bold text-teal-600 hover:underline"
                  >
                    + Vincular primeiro animal
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {tutorAnimals.map(animal => (
                    <div
                      key={animal.id}
                      className="p-3 rounded-2xl border border-slate-200 hover:border-teal-300 hover:bg-slate-50/50 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-bold">
                          <PawPrint className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">{animal.nome}</h4>
                          <p className="text-[11px] text-slate-500">
                            {animal.especie} • {animal.raca || 'SRD'} • {animal.peso}kg
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {onOpenConsulta && (
                          <button
                            onClick={() => onOpenConsulta(animal.id)}
                            className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-bold transition-colors"
                          >
                            Atender
                          </button>
                        )}
                        {onNavigateToAnimal && (
                          <button
                            onClick={() => onNavigateToAnimal(animal.id)}
                            className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg transition-colors"
                            title="Ver ficha do animal"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* ── MODAL: NOVO / EDITAR RESPONSÁVEL ───────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                {isEditing ? 'Editar Responsável' : 'Novo Responsável'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={formData.nomeCompleto}
                  onChange={e => setFormData({ ...formData, nomeCompleto: e.target.value })}
                  placeholder="Nome do tutor ou tutora"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={formData.cpf}
                    onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="cliente@exemplo.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Endereço (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.endereco}
                  onChange={e => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Rua, número, bairro, cidade..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
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
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-teal-600 text-white hover:bg-teal-700 shadow-md shadow-teal-600/30 transition-all"
                >
                  {saving ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Cadastrar Responsável')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: VINCULAR ANIMAL AO TUTOR ─────────────────────────────────── */}
      {isAddAnimalModalOpen && selectedResp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <PawPrint className="w-5 h-5 text-amber-500" />
                  Adicionar Animal
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Tutor: <strong>{selectedResp.nomeCompleto}</strong></p>
              </div>
              <button onClick={() => setIsAddAnimalModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAnimal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Nome do Paciente *
                </label>
                <input
                  type="text"
                  value={newAnimalNome}
                  onChange={e => setNewAnimalNome(e.target.value)}
                  placeholder="Ex: Thor, Mel, Luna..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Espécie *
                  </label>
                  <select
                    value={newAnimalEspecie}
                    onChange={e => setNewAnimalEspecie(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white"
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
                    value={newAnimalSexo}
                    onChange={e => setNewAnimalSexo(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                  >
                    <option value="Macho">Macho</option>
                    <option value="Fêmea">Fêmea</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Raça
                  </label>
                  <input
                    type="text"
                    value={newAnimalRaca}
                    onChange={e => setNewAnimalRaca(e.target.value)}
                    placeholder="SRD"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Idade
                  </label>
                  <input
                    type="text"
                    value={newAnimalIdade}
                    onChange={e => setNewAnimalIdade(e.target.value)}
                    placeholder="Ex: 3 anos"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newAnimalPeso}
                    onChange={e => setNewAnimalPeso(e.target.value)}
                    placeholder="Ex: 12.5"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddAnimalModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-teal-600 text-white hover:bg-teal-700 shadow-md shadow-teal-600/30 transition-all"
                >
                  {saving ? 'Cadastrando...' : 'Cadastrar Animal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
