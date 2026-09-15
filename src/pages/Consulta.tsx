import React, { useState, useEffect, useMemo } from 'react';
import { 
  Stethoscope, 
  FileText, 
  FileSignature, 
  User, 
  Phone, 
  Search, 
  Clock, 
  ChevronDown, 
  Activity, 
  Sparkles,
  ClipboardCheck,
  Save,
  CheckCircle2,
  FileCheck2,
  ShieldCheck,
  Syringe,
  Recycle,
  MapPin,
  Navigation,
  HeartPulse
} from 'lucide-react';
import { 
  subscribePacientes, 
  subscribeResponsaveis, 
  saveConsultaAtendimento, 
  subscribeConsultasPaciente,
  subscribeTermosAtendimento,
  subscribeExames,
  subscribeAnalises,
  getHomeCareConfig,
  type Paciente, 
  type Responsavel, 
  type AppUser, 
  type ConsultaAtendimento,
  type ParametrosVitais,
  type ExameFisicoItem,
  type TermoAtendimento,
  type Exame,
  type AnaliseClinica,
  type HomeCareConfig
} from '../services/dataService';
import GerarDocumentoModal, { ExtendedTipoDoc } from '../components/GerarDocumentoModal';
import AuditoriaModal from '../components/AuditoriaModal';
import MedicamentosAplicadosModal from '../components/MedicamentosAplicadosModal';
import ChecklistResiduosModal from '../components/ChecklistResiduosModal';

interface ConsultaProps {
  selectedPatientId?: string | null;
  onSelectPatient?: (patientId: string) => void;
  userProfile?: AppUser | null;
}

const SISTEMAS_CORP = [
  'Pele e Pelagem',
  'Olhos e Anexos',
  'Ouvidos / Conduto Auditivo',
  'Nariz e Garganta',
  'Boca, Dentes e Gengivas',
  'Sistema Musculoesquelético',
  'Sistema Cardiovascular (Coração)',
  'Abdômen e Palpação',
  'Sistema Respiratório (Pulmões)',
  'Sistema Gastrointestinal',
  'Sistema Urogenital',
  'Peso e Escore Corporal',
  'Dieta e Nutrição'
];

export default function Consulta({ selectedPatientId, onSelectPatient, userProfile }: ConsultaProps) {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([]);
  const [currentPatientId, setCurrentPatientId] = useState<string>(selectedPatientId || '');

  // Subscriptions do paciente selecionado
  const [consultasHist, setConsultasHist] = useState<ConsultaAtendimento[]>([]);
  const [termosHist, setTermosHist] = useState<TermoAtendimento[]>([]);
  const [examesHist, setExamesHist] = useState<Exame[]>([]);
  const [analisesHist, setAnalisesHist] = useState<AnaliseClinica[]>([]);

  // Abas da tela de Consulta
  const [activeSubTab, setActiveSubTab] = useState<'anamnese' | 'prontuario'>('anamnese');

  // Modais das Ações Principais
  const [isTermoModalOpen, setIsTermoModalOpen] = useState(false);
  const [termoInitialType, setTermoInitialType] = useState<ExtendedTipoDoc>('tcle_geral');
  const [isAuditoriaModalOpen, setIsAuditoriaModalOpen] = useState(false);
  const [isMedicamentosOpen, setIsMedicamentosOpen] = useState(false);
  const [isResiduosOpen, setIsResiduosOpen] = useState(false);

  // Atendimento Domiciliar & Precificação de Deslocamento
  const [homeCareAtivo, setHomeCareAtivo] = useState(false);
  const [homeCareConfig, setHomeCareConfig] = useState<HomeCareConfig | null>(null);
  const [isDomiciliar, setIsDomiciliar] = useState(false);
  const [distanciaKm, setDistanciaKm] = useState('10');
  const [valorConsulta, setValorConsulta] = useState('180.00');
  const [valorDeslocamento, setValorDeslocamento] = useState('35.00');

  useEffect(() => {
    getHomeCareConfig().then(cfg => {
      if (cfg?.ativo) {
        setHomeCareAtivo(true);
        setHomeCareConfig(cfg);
      }
    });
  }, []);

  // Cálculo automático do deslocamento quando distância ou configuração mudar
  useEffect(() => {
    if (isDomiciliar && homeCareConfig) {
      const km = parseFloat(distanciaKm) || 0;
      if (homeCareConfig.modeloPrecificacao === 'por_km') {
        const precoKm = homeCareConfig.valorPorKm || 3.5;
        const minTaxa = homeCareConfig.taxaMinima || 0;
        const calc = Math.max(minTaxa, km * precoKm);
        setValorDeslocamento(calc.toFixed(2));
      } else if (homeCareConfig.modeloPrecificacao === 'faixas' && homeCareConfig.faixas && homeCareConfig.faixas.length > 0) {
        const sorted = [...homeCareConfig.faixas].sort((a, b) => a.ateKm - b.ateKm);
        const faixa = sorted.find(f => km <= f.ateKm);
        if (faixa) {
          setValorDeslocamento(faixa.valor.toFixed(2));
        } else {
          const lastFaixa = sorted[sorted.length - 1];
          setValorDeslocamento(lastFaixa ? lastFaixa.valor.toFixed(2) : '50.00');
        }
      }
    }
  }, [distanciaKm, isDomiciliar, homeCareConfig]);

  // ── FORMULÁRIO DE ANAMNESE E EXAME FÍSICO ──────────────────────────────────
  const [sintomasPrincipais, setSintomasPrincipais] = useState('');
  const [historicoClinico, setHistoricoClinico] = useState('');
  const [pesoAtual, setPesoAtual] = useState('');
  const [dietaAtual, setDietaAtual] = useState('');
  const [diagnosticoSuspeito, setDiagnosticoSuspeito] = useState('');
  const [condutaTratamento, setCondutaTratamento] = useState('');

  // Parâmetros Vitais
  const [temperatura, setTemperatura] = useState('');
  const [freqCardiaca, setFreqCardiaca] = useState('');
  const [freqRespiratoria, setFreqRespiratoria] = useState('');
  const [tpc, setTpc] = useState('');
  const [mucosas, setMucosas] = useState('');
  const [desidratacao, setDesidratacao] = useState('');
  const [ecc, setEcc] = useState('');
  const [escoreDor, setEscoreDor] = useState('');
  const [pressaoSistolica, setPressaoSistolica] = useState('');

  // Checklist por Sistema Corporal
  const [exameSistemas, setExameSistemas] = useState<Record<string, ExameFisicoItem>>(() => {
    const init: Record<string, ExameFisicoItem> = {};
    SISTEMAS_CORP.forEach(s => {
      init[s] = { status: 'Normal', observacao: '' };
    });
    return init;
  });

  const [savingConsulta, setSavingConsulta] = useState(false);
  const [consultaSalvaSucesso, setConsultaSalvaSucesso] = useState(false);

  // Busca no Prontuário
  const [searchProntuario, setSearchProntuario] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');

  // Subscriptions principais
  useEffect(() => {
    const unsubPac = subscribePacientes((list) => {
      setPacientes(list);
      if (!currentPatientId && list.length > 0) {
        const id = selectedPatientId || list[0].id;
        setCurrentPatientId(id);
        if (onSelectPatient) onSelectPatient(id);
      }
    });
    const unsubResp = subscribeResponsaveis(setResponsaveis);

    return () => {
      unsubPac();
      unsubResp();
    };
  }, []);

  useEffect(() => {
    if (selectedPatientId && selectedPatientId !== currentPatientId) {
      setCurrentPatientId(selectedPatientId);
    }
  }, [selectedPatientId]);

  // Carrega histórico quando muda o paciente
  useEffect(() => {
    if (!currentPatientId) return;

    const unsubCons = subscribeConsultasPaciente(currentPatientId, setConsultasHist);
    const unsubTerm = subscribeTermosAtendimento(currentPatientId, setTermosHist);
    const unsubEx = subscribeExames(currentPatientId, setExamesHist);
    const unsubAn = subscribeAnalises(currentPatientId, setAnalisesHist);

    // Carrega peso inicial se paciente tiver peso
    const p = pacientes.find(item => item.id === currentPatientId);
    if (p && p.peso) {
      setPesoAtual(String(p.peso));
    }

    return () => {
      unsubCons();
      unsubTerm();
      unsubEx();
      unsubAn();
    };
  }, [currentPatientId, pacientes]);

  // Paciente Atual e Tutor
  const currentPatient = useMemo(() => {
    return pacientes.find(p => p.id === currentPatientId);
  }, [pacientes, currentPatientId]);

  const currentTutor = useMemo(() => {
    if (!currentPatient) return null;
    return responsaveis.find(r => r.id === currentPatient.tutorId);
  }, [responsaveis, currentPatient]);

  // Manipulação do Checklist por Sistema
  const toggleSistemaStatus = (sistema: string, status: 'Normal' | 'Alterado') => {
    setExameSistemas(prev => ({
      ...prev,
      [sistema]: {
        ...prev[sistema],
        status,
        observacao: status === 'Normal' ? '' : (prev[sistema]?.observacao || '')
      }
    }));
  };

  const updateSistemaObs = (sistema: string, observacao: string) => {
    setExameSistemas(prev => ({
      ...prev,
      [sistema]: {
        ...prev[sistema],
        observacao
      }
    }));
  };

  // Salvar Consulta
  const handleSaveConsulta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatientId) {
      alert('Selecione um paciente para registrar o atendimento.');
      return;
    }

    setSavingConsulta(true);
    try {
      const vConsulta = parseFloat(valorConsulta) || 0;
      const vDesloc = isDomiciliar ? (parseFloat(valorDeslocamento) || 0) : 0;
      const vTotal = vConsulta + vDesloc;

      const parametrosVitaisObj: ParametrosVitais = {
        temperatura: temperatura.trim() || undefined,
        freqCardiaca: freqCardiaca.trim() || undefined,
        freqRespiratoria: freqRespiratoria.trim() || undefined,
        tpc: tpc.trim() || undefined,
        mucosas: mucosas || undefined,
        desidratacao: desidratacao || undefined,
        ecc: ecc || undefined,
        escoreDor: escoreDor || undefined,
        pressaoSistolica: pressaoSistolica.trim() || undefined,
      };

      const novaConsulta: ConsultaAtendimento = {
        id: `cons_${Date.now()}`,
        pacienteId: currentPatientId,
        tutorId: currentPatient?.tutorId || '',
        data: new Date().toISOString().slice(0, 10),
        sintomasPrincipais: sintomasPrincipais.trim(),
        historicoClinico: historicoClinico.trim(),
        exameFisico: exameSistemas,
        parametrosVitais: parametrosVitaisObj,
        peso: Number(pesoAtual) || 0,
        dieta: dietaAtual.trim(),
        diagnostico: diagnosticoSuspeito.trim(),
        conduta: condutaTratamento.trim(),
        veterinarioNome: userProfile?.nome || 'Médico(a) Veterinário(a)',
        isDomiciliar: isDomiciliar,
        distanciaKm: isDomiciliar ? (parseFloat(distanciaKm) || 0) : undefined,
        valorConsulta: vConsulta,
        valorDeslocamento: isDomiciliar ? vDesloc : undefined,
        valorTotal: vTotal,
        criadoEm: new Date().toISOString()
      };

      await saveConsultaAtendimento(novaConsulta);

      setConsultaSalvaSucesso(true);
      setTimeout(() => {
        setConsultaSalvaSucesso(false);
      }, 2500);

      // Limpar campos principais
      setSintomasPrincipais('');
      setHistoricoClinico('');
      setDiagnosticoSuspeito('');
      setCondutaTratamento('');
      setTemperatura('');
      setFreqCardiaca('');
      setFreqRespiratoria('');
      setTpc('');
      setMucosas('');
      setDesidratacao('');
      setEcc('');
      setEscoreDor('');
      setPressaoSistolica('');
    } catch (err) {
      console.error('Erro ao salvar consulta', err);
      alert('Erro ao salvar a consulta.');
    } finally {
      setSavingConsulta(false);
    }
  };

  // Linha do tempo unificada do prontuário
  const timelineItems = useMemo(() => {
    const items: Array<{
      id: string;
      tipo: 'consulta' | 'termo' | 'exame' | 'analise';
      titulo: string;
      data: string;
      detalhes: string;
      responsavel?: string;
    }> = [];

    // Consultas
    consultasHist.forEach(c => {
      const alterados = Object.entries(c.exameFisico || {})
        .filter(([_, v]) => v.status === 'Alterado')
        .map(([k]) => k);

      const vitaisList: string[] = [];
      if (c.parametrosVitais) {
        const v = c.parametrosVitais;
        if (v.temperatura) vitaisList.push(`Temp: ${v.temperatura}°C`);
        if (v.freqCardiaca) vitaisList.push(`FC: ${v.freqCardiaca} bpm`);
        if (v.freqRespiratoria) vitaisList.push(`FR: ${v.freqRespiratoria} mrpm`);
        if (v.tpc) vitaisList.push(`TPC: ${v.tpc}s`);
        if (v.mucosas) vitaisList.push(`Mucosas: ${v.mucosas}`);
        if (v.desidratacao) vitaisList.push(`Desidratação: ${v.desidratacao}`);
        if (v.ecc) vitaisList.push(`ECC: ${v.ecc}/9`);
        if (v.escoreDor !== undefined && v.escoreDor !== '') vitaisList.push(`Dor: ${v.escoreDor}/4`);
        if (v.pressaoSistolica) vitaisList.push(`PA: ${v.pressaoSistolica} mmHg`);
      }
      const vitaisStr = vitaisList.length > 0 ? ` [Vitais: ${vitaisList.join(' · ')}]` : '';

      items.push({
        id: c.id,
        tipo: 'consulta',
        titulo: 'Consulta Clínica & Anamnese',
        data: c.data || c.criadoEm,
        detalhes: `Sintomas: ${c.sintomasPrincipais || 'Não descritos'}.${vitaisStr} ${alterados.length > 0 ? `Sistemas alterados: ${alterados.join(', ')}.` : 'Exame físico sem alterações.'} Conduta: ${c.conduta || 'Rotina.'}`,
        responsavel: c.veterinarioNome
      });
    });

    // Termos e Documentos
    termosHist.forEach(t => {
      items.push({
        id: t.id,
        tipo: 'termo',
        titulo: `Documento: ${t.tipo.replace(/_/g, ' ').toUpperCase()}`,
        data: t.geradoEm,
        detalhes: t.conteudoClinico || t.baseLegal,
        responsavel: t.geradoPor
      });
    });

    // Exames
    examesHist.forEach(e => {
      items.push({
        id: e.id,
        tipo: 'exame',
        titulo: `Exame Complementar: ${e.tipo}`,
        data: e.dataUpload,
        detalhes: `Arquivo anexado no prontuário. Link de acesso registrado.`
      });
    });

    // Análises IA
    analisesHist.forEach(a => {
      items.push({
        id: a.id,
        tipo: 'analise',
        titulo: `Análise Assistida ClinicOS IA #${a.numero || 1}`,
        data: a.dataAnalise,
        detalhes: a.interpretacaoClinica || a.condutaSugerida || 'Análise clínica assistida por IA concluída.'
      });
    });

    items.sort((a, b) => b.data.localeCompare(a.data));

    // Filtragem
    return items.filter(item => {
      const matchesSearch = !searchProntuario.trim() || 
        item.titulo.toLowerCase().includes(searchProntuario.toLowerCase()) ||
        item.detalhes.toLowerCase().includes(searchProntuario.toLowerCase());

      const matchesTipo = filtroTipo === 'todos' || item.tipo === filtroTipo;

      return matchesSearch && matchesTipo;
    });
  }, [consultasHist, termosHist, examesHist, analisesHist, searchProntuario, filtroTipo]);

  return (
    <div className="space-y-6 pb-16 animate-fade-in max-w-[1400px] mx-auto text-slate-700">
      
      {/* ── CARD SUPERIOR: IDENTIFICAÇÃO DO PACIENTE E SELETOR ───────────────── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Seletor e Ficha Rápida do Paciente */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border-2 border-teal-200 flex items-center justify-center text-teal-700 shrink-0 shadow-sm">
              <Stethoscope className="w-8 h-8" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-0.5 rounded-full">
                  Atendimento Clínico
                </span>

                {/* Seletor de Paciente */}
                <div className="relative inline-block">
                  <select
                    value={currentPatientId}
                    onChange={(e) => {
                      setCurrentPatientId(e.target.value);
                      if (onSelectPatient) onSelectPatient(e.target.value);
                    }}
                    className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border-none rounded-xl px-3 py-1 pr-6 cursor-pointer focus:ring-2 focus:ring-teal-500 outline-none appearance-none"
                  >
                    {pacientes.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nome} ({p.especie})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {currentPatient ? (
                <div>
                  <h1 className="text-2xl font-bold text-slate-800 leading-tight">
                    {currentPatient.nome}
                  </h1>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500 font-medium">
                    <span>Espécie: <strong className="text-slate-700">{currentPatient.especie}</strong></span>
                    <span>Raça: <strong className="text-slate-700">{currentPatient.raca || 'SRD'}</strong></span>
                    <span>Sexo: <strong className="text-slate-700">{currentPatient.sexo}</strong></span>
                    <span>Idade: <strong className="text-slate-700">{currentPatient.idade ? `${currentPatient.idade}` : '—'}</strong></span>
                    <span>Peso: <strong className="text-slate-700">{currentPatient.peso ? `${currentPatient.peso} kg` : '—'}</strong></span>
                  </div>

                  {currentTutor && (
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                      <span className="flex items-center gap-1 font-semibold text-teal-700">
                        <User className="w-3.5 h-3.5" />
                        Tutor: {currentTutor.nomeCompleto}
                      </span>
                      {currentTutor.telefone && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Phone className="w-3 h-3" />
                          {currentTutor.telefone}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Nenhum paciente selecionado</h2>
                  <p className="text-xs text-slate-500">Cadastre um animal ou selecione na lista de Animais.</p>
                </div>
              )}
            </div>
          </div>

          {/* Botões de Ações Rápidas (Termos e Auditoria) */}
          <div className="flex flex-wrap items-center gap-3">
            {/* 3. Botão "Termo / Documento" */}
            <button
              onClick={() => setIsTermoModalOpen(true)}
              disabled={!currentPatientId}
              className="px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <FileSignature className="w-4 h-4 text-indigo-600" />
              Termo / Documento
            </button>

            {/* 4. Botão "Auditoria / Maleta" */}
            <button
              onClick={() => setIsAuditoriaModalOpen(true)}
              className="px-4 py-2.5 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100 text-teal-800 text-xs font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              Auditoria / Maleta
            </button>

            {/* 5 & 6. Botões de Atendimento Domiciliar — só aparecem quando o módulo está ativo */}
            {homeCareAtivo && (
              <>
                <button
                  onClick={() => setIsMedicamentosOpen(true)}
                  disabled={!currentPatientId}
                  className="px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Syringe className="w-4 h-4 text-amber-600" />
                  Medicamentos Aplicados
                </button>

                <button
                  onClick={() => setIsResiduosOpen(true)}
                  disabled={!currentPatientId}
                  className="px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Recycle className="w-4 h-4 text-emerald-600" />
                  Checklist de Resíduos
                </button>
              </>
            )}
          </div>

        </div>

        {/* Abas de Navegação Interna: Anamnese vs Prontuário */}
        <div className="flex items-center gap-3 border-t border-slate-100 mt-6 pt-4">
          <button
            onClick={() => setActiveSubTab('anamnese')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'anamnese'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            Anamnese & Exame Físico
          </button>

          <button
            onClick={() => setActiveSubTab('prontuario')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'prontuario'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            Prontuário & Linha do Tempo ({timelineItems.length})
          </button>
        </div>
      </div>

      {/* ── CONTEÚDO DA ABA 1: ANAMNESE E EXAME FÍSICO ────────────────────────── */}
      {activeSubTab === 'anamnese' && (
        <form onSubmit={handleSaveConsulta} className="space-y-6">
          
          {/* Card: Queixa Principal e Histórico Clínico */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-600" />
              1. Anamnese do Paciente
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Sintomas Principais / Motivo da Consulta *
                </label>
                <textarea
                  rows={3}
                  value={sintomasPrincipais}
                  onChange={e => setSintomasPrincipais(e.target.value)}
                  placeholder="Ex: Vômito persistente há 2 dias, letargia e recusa alimentar..."
                  className="w-full p-3 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Histórico Clínico e Manejo
                </label>
                <textarea
                  rows={3}
                  value={historicoClinico}
                  onChange={e => setHistoricoClinico(e.target.value)}
                  placeholder="Ex: Vacinação em dia, vermifugado no mês passado, sem alergias prévias relatadas..."
                  className="w-full p-3 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>

            {/* Parâmetros Vitais Rápidos e Nutrição */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Peso Aferido nesta Consulta (kg)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={pesoAtual}
                  onChange={e => setPesoAtual(e.target.value)}
                  placeholder="Ex: 14.2"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Dieta / Tipo de Alimentação
                </label>
                <input
                  type="text"
                  value={dietaAtual}
                  onChange={e => setDietaAtual(e.target.value)}
                  placeholder="Ex: Ração super premium seca 2x ao dia..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>

            {/* Bloco: Parâmetros Vitais */}
            <div className="pt-4 mt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-rose-500" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Parâmetros Vitais
                  </h4>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    Exame Físico Inicial · Opcional
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {/* 1. Temperatura Retal */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Temperatura Retal (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={temperatura}
                    onChange={e => setTemperatura(e.target.value)}
                    placeholder="Ex: 38.5"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none font-semibold text-slate-800 bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Ref: Cães 37.5–39.2°C / Gatos 38–39.2°C</span>
                </div>

                {/* 2. Frequência Cardíaca */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Frequência Cardíaca (bpm)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={freqCardiaca}
                    onChange={e => setFreqCardiaca(e.target.value)}
                    placeholder="Ex: 110"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none font-semibold text-slate-800 bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Batimentos por minuto</span>
                </div>

                {/* 3. Frequência Respiratória */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Frequência Respiratória (mrpm)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={freqRespiratoria}
                    onChange={e => setFreqRespiratoria(e.target.value)}
                    placeholder="Ex: 24"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none font-semibold text-slate-800 bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Movimentos respiratórios por min</span>
                </div>

                {/* 4. Tempo de Preenchimento Capilar (TPC) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Tempo de Preenchimento Capilar — TPC (seg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={tpc}
                    onChange={e => setTpc(e.target.value)}
                    placeholder="Ex: 1.5"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none font-semibold text-slate-800 bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Referência normal: até 2 segundos</span>
                </div>

                {/* 5. Coloração das Mucosas */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Coloração das Mucosas
                  </label>
                  <select
                    value={mucosas}
                    onChange={e => setMucosas(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none font-medium text-slate-800 bg-white cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    <option value="Rosadas">Rosadas</option>
                    <option value="Pálidas">Pálidas</option>
                    <option value="Ictéricas">Ictéricas</option>
                    <option value="Cianóticas">Cianóticas</option>
                    <option value="Congestas">Congestas</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Rosadas / Pálidas / Ictéricas / Cianóticas / Congestas</span>
                </div>

                {/* 6. Grau de Desidratação */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Grau de Desidratação (%)
                  </label>
                  <select
                    value={desidratacao}
                    onChange={e => setDesidratacao(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none font-medium text-slate-800 bg-white cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    <option value="0% (hidratado)">0% (hidratado)</option>
                    <option value="5%">5% (desidratação leve)</option>
                    <option value="8%">8% (desidratação moderada)</option>
                    <option value="10%+">10%+ (desidratação grave)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Ex: 0% (hidratado), 5%, 8%, 10%+</span>
                </div>

                {/* 7. Escore de Condição Corporal (ECC) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Escore de Condição Corporal — ECC
                  </label>
                  <select
                    value={ecc}
                    onChange={e => setEcc(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none font-medium text-slate-800 bg-white cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    <option value="1">1 — Muito Caquético</option>
                    <option value="2">2 — Muito Magro</option>
                    <option value="3">3 — Magro</option>
                    <option value="4">4 — Abaixo do Ideal</option>
                    <option value="5">5 — Ideal</option>
                    <option value="6">6 — Sobrepeso Leve</option>
                    <option value="7">7 — Sobrepeso Moderado</option>
                    <option value="8">8 — Obeso</option>
                    <option value="9">9 — Obesidade Severa</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Escala 1 a 9 (padrão WSAVA)</span>
                </div>

                {/* 8. Escore de Dor */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Escore de Dor
                  </label>
                  <select
                    value={escoreDor}
                    onChange={e => setEscoreDor(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none font-medium text-slate-800 bg-white cursor-pointer"
                  >
                    <option value="">Selecione (Opcional)...</option>
                    <option value="0">0 — Sem Dor</option>
                    <option value="1">1 — Dor Leve</option>
                    <option value="2">2 — Dor Moderada</option>
                    <option value="3">3 — Dor Severa</option>
                    <option value="4">4 — Dor Excruciante</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Escala 0 a 4 (campo opcional)</span>
                </div>

                {/* 9. Pressão Arterial Sistólica */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Pressão Arterial Sistólica (mmHg)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={pressaoSistolica}
                    onChange={e => setPressaoSistolica(e.target.value)}
                    placeholder="Ex: 120 (Opcional)"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none font-semibold text-slate-800 bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Campo opcional (aparelho Doppler/oscilométrico)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Checklist por Sistema Corporal (Exame Físico Completo) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-teal-600" />
                  2. Exame Físico por Sistema
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Marque cada sistema como <strong>Normal</strong> ou <strong>Alterado</strong>. Sistemas alterados abrem campo de anotação clínica.
                </p>
              </div>

              <span className="text-xs font-semibold text-slate-400">
                13 Sistemas Avaliados
              </span>
            </div>

            {/* Grid dos 13 Sistemas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {SISTEMAS_CORP.map(sistema => {
                const item = exameSistemas[sistema] || { status: 'Normal', observacao: '' };
                const isAlterado = item.status === 'Alterado';

                return (
                  <div 
                    key={sistema}
                    className={`p-4 rounded-2xl border transition-all ${
                      isAlterado 
                        ? 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-400/30' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-xs font-bold text-slate-800">{sistema}</span>
                      
                      {/* Botões Rápidos: Normal vs Alterado */}
                      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl">
                        <button
                          type="button"
                          onClick={() => toggleSistemaStatus(sistema, 'Normal')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            !isAlterado 
                              ? 'bg-emerald-600 text-white shadow-sm' 
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          Normal
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSistemaStatus(sistema, 'Alterado')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            isAlterado 
                              ? 'bg-amber-600 text-white shadow-sm' 
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          Alterado
                        </button>
                      </div>
                    </div>

                    {/* Campo de Nota Curta (aparece apenas quando Alterado) */}
                    {isAlterado && (
                      <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <input
                          type="text"
                          value={item.observacao || ''}
                          onChange={(e) => updateSistemaObs(sistema, e.target.value)}
                          placeholder="Descreva a alteração encontrada (ex: lesão eritematosa, sopro grau II, crepitação...)"
                          className="w-full px-3 py-1.5 rounded-xl border border-amber-300 bg-white text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-amber-500 outline-none"
                          required
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card: Atendimento Domiciliar e Calculadora de Deslocamento */}
          {homeCareAtivo && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-teal-600" />
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Atendimento Domiciliar & Deslocamento</h3>
                    <p className="text-xs text-slate-500">
                      Cálculo de rota e precificação do deslocamento volante.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDomiciliar}
                    onChange={e => setIsDomiciliar(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                  <span className="ml-2 text-xs font-bold text-slate-700">Atendimento Domiciliar</span>
                </label>
              </div>

              {isDomiciliar && (
                <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" /> Ponto de Partida (Endereço-Base)
                      </span>
                      <p className="text-xs font-semibold text-slate-700 mt-1">
                        {homeCareConfig?.enderecoBase || 'Endereço da Clínica / Sede'}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <User className="w-3 h-3 text-teal-600" /> Destino (Endereço do Tutor)
                      </span>
                      <p className="text-xs font-semibold text-slate-700 mt-1">
                        {currentTutor?.endereco || 'Endereço cadastrado na ficha do tutor'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Distância em KM *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={distanciaKm}
                          onChange={e => setDistanciaKm(e.target.value)}
                          placeholder="Ex: 12.5"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none font-semibold text-slate-800"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">km</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Modelo: {homeCareConfig?.modeloPrecificacao === 'por_km' ? `Por KM (R$ ${(homeCareConfig.valorPorKm || 3.5).toFixed(2)}/km)` : 'Tabela de Faixas'}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Valor da Consulta (R$)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={valorConsulta}
                        onChange={e => setValorConsulta(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Valor do Deslocamento (R$)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={valorDeslocamento}
                        onChange={e => setValorDeslocamento(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-teal-300 bg-teal-50/40 text-sm focus:ring-2 focus:ring-teal-500 outline-none font-semibold text-teal-900"
                      />
                    </div>
                  </div>

                  {/* Resumo Financeiro Separado */}
                  <div className="bg-gradient-to-r from-teal-50 via-teal-50/50 to-white border border-teal-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-slate-500">Consulta:</span>
                        <strong className="text-slate-800 ml-1">R$ {parseFloat(valorConsulta || '0').toFixed(2)}</strong>
                      </div>
                      <span className="text-slate-300">+</span>
                      <div>
                        <span className="text-teal-700 font-medium">Deslocamento:</span>
                        <strong className="text-teal-900 ml-1">R$ {parseFloat(valorDeslocamento || '0').toFixed(2)}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-teal-200 shadow-sm">
                      <span className="text-xs font-bold text-slate-600 uppercase">Total do Atendimento:</span>
                      <span className="text-base font-black text-teal-700">
                        R$ {((parseFloat(valorConsulta) || 0) + (parseFloat(valorDeslocamento) || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card: Diagnóstico e Conduta */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-teal-600" />
              3. Diagnóstico Suspeito & Conduta Terapêutica
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Hipóteses Diagnósticas
                </label>
                <textarea
                  rows={3}
                  value={diagnosticoSuspeito}
                  onChange={e => setDiagnosticoSuspeito(e.target.value)}
                  placeholder="Ex: Gastroenterite aguda bacteriana; suspeita de corpo estranho radiotransparente..."
                  className="w-full p-3 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Conduta e Plano de Tratamento
                </label>
                <textarea
                  rows={3}
                  value={condutaTratamento}
                  onChange={e => setCondutaTratamento(e.target.value)}
                  placeholder="Ex: Fluidoterapia EV, antiemético SC, solicitação de US abdominal e hemograma..."
                  className="w-full p-3 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>

            {/* Ação de Salvar Atendimento */}
            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
              <span className="text-xs text-slate-400">
                A consulta será arquivada diretamente no histórico permanente deste paciente.
              </span>

              <button
                type="submit"
                disabled={savingConsulta || !currentPatientId}
                className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {savingConsulta ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvando Consulta...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Consulta / Prontuário
                  </>
                )}
              </button>
            </div>

            {consultaSalvaSucesso && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Consulta registrada com sucesso no prontuário do paciente!
              </div>
            )}
          </div>

        </form>
      )}

      {/* ── CONTEÚDO DA ABA 2: PRONTUÁRIO / LINHA DO TEMPO UNIFICADA ──────────── */}
      {activeSubTab === 'prontuario' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                Linha do Tempo e Prontuário do Paciente
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Histórico integrado de consultas, termos assinados, exames e análises clínicas.
              </p>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchProntuario}
                  onChange={e => setSearchProntuario(e.target.value)}
                  placeholder="Buscar no histórico..."
                  className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none w-48"
                />
              </div>

              <select
                value={filtroTipo}
                onChange={e => setFiltroTipo(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none bg-white"
              >
                <option value="todos">Todos os Registros</option>
                <option value="consulta">Apenas Consultas</option>
                <option value="termo">Apenas Termos</option>
                <option value="exame">Apenas Exames</option>
                <option value="analise">Apenas Análises IA</option>
              </select>
            </div>
          </div>

          {/* Itens Cronológicos */}
          {timelineItems.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-700">Nenhum registro no prontuário ainda</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Registre uma consulta na aba Anamnese ou gere termos e documentos para compor o histórico do animal.
              </p>
            </div>
          ) : (
            <div className="space-y-4 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-slate-100">
              {timelineItems.map((item) => {
                const dateObj = new Date(item.data);
                const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('pt-BR') : item.data;

                const badgeBg = {
                  consulta: 'bg-teal-100 text-teal-700 border-teal-200',
                  termo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
                  exame: 'bg-amber-100 text-amber-700 border-amber-200',
                  analise: 'bg-purple-100 text-purple-700 border-purple-200'
                }[item.tipo];

                const IconComponent = {
                  consulta: Stethoscope,
                  termo: FileSignature,
                  exame: FileText,
                  analise: Sparkles
                }[item.tipo];

                return (
                  <div key={item.id} className="relative flex items-start gap-4 pl-2 group">
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 z-10 bg-white ${badgeBg}`}>
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>

                    <div className="bg-slate-50/80 hover:bg-slate-50 p-4 rounded-2xl border border-slate-200 flex-1 transition-all">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-bold text-slate-800">
                          {item.titulo}
                        </span>
                        <div className="flex items-center gap-2">
                          {item.responsavel && (
                            <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                              {item.responsavel}
                            </span>
                          )}
                          <span className="text-xs text-slate-400 font-medium">
                            {dateStr}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed mt-1">
                        {item.detalhes}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: TERMO / DOCUMENTO (GERARDOCUMENTOMODAL) ──────────────────── */}
      {isTermoModalOpen && (
        <GerarDocumentoModal
          clientId={currentPatientId}
          atendimentoId={currentPatientId}
          initialType={termoInitialType}
          patientName={currentPatient?.nome}
          tutorName={currentTutor?.nomeCompleto}
          onClose={() => setIsTermoModalOpen(false)}
        />
      )}

      {/* ── MODAL: AUDITORIA / MALETA (AUDITORIAMODAL) ──────────────────────── */}
      {isAuditoriaModalOpen && (
        <AuditoriaModal
          clientId={currentPatientId}
          onClose={() => setIsAuditoriaModalOpen(false)}
        />
      )}

      {/* ── MODAL: MEDICAMENTOS APLICADOS ────────────────────────────────────── */}
      {isMedicamentosOpen && currentPatientId && (
        <MedicamentosAplicadosModal
          atendimentoId={currentPatientId}
          pacienteId={currentPatientId}
          pacienteNome={currentPatient?.nome}
          userProfile={userProfile}
          onClose={() => setIsMedicamentosOpen(false)}
          onOpenTermo={(tipo) => {
            setIsMedicamentosOpen(false);
            setTermoInitialType(tipo as any);
            setIsTermoModalOpen(true);
          }}
        />
      )}

      {/* ── MODAL: CHECKLIST DE RESÍDUOS PGRSS ───────────────────────────────── */}
      {isResiduosOpen && currentPatientId && (
        <ChecklistResiduosModal
          atendimentoId={currentPatientId}
          pacienteNome={currentPatient?.nome}
          userProfile={userProfile}
          onClose={() => setIsResiduosOpen(false)}
        />
      )}

    </div>
  );
}
