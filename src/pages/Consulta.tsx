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
  HeartPulse, 
  TrendingUp, 
  Edit, 
  Plus, 
  Pill, 
  Eye, 
  Brain, 
  ListChecks, 
  Smile, 
  Square, 
  CheckSquare
} from 'lucide-react';
import { 
  subscribePacientes, 
  subscribeResponsaveis, 
  saveConsultaAtendimento, 
  subscribeConsultasPaciente,
  subscribeTermosAtendimento,
  subscribeRequisicoesExames,
  subscribeExames,
  subscribeNotas,
  subscribeEvolucoesPaciente,
  saveEvolucaoCaso,
  subscribeRoteirosAnamnese,
  getHomeCareConfig,
  type Paciente, 
  type Responsavel, 
  type AppUser, 
  type ConsultaAtendimento,
  type ParametrosVitais,
  type ExameFisicoItem,
  type ObservacaoAntesToque,
  type EstadoCorporalHidratacao,
  type NeurologicoBasico,
  type DorEComportamento,
  type ChecklistFinalizacao,
  type TermoAtendimento,
  type RequisicaoExame,
  type Exame,
  type NotaExplicativa,
  type EvolucaoCaso,
  type HomeCareConfig,
  type RoteiroAnamnese
} from '../services/dataService';
import GerarDocumentoModal, { ExtendedTipoDoc } from '../components/GerarDocumentoModal';
import ReceitaDigitalModal from '../components/ReceitaDigitalModal';
import AuditoriaModal from '../components/AuditoriaModal';
import MedicamentosAplicadosModal from '../components/MedicamentosAplicadosModal';
import ChecklistResiduosModal from '../components/ChecklistResiduosModal';
import EvolucaoCasoModule from '../components/EvolucaoCasoModule';
import AnamneseGuiadaModal from '../components/AnamneseGuiadaModal';

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
  const [requisicoesHist, setRequisicoesHist] = useState<RequisicaoExame[]>([]);
  const [examesHist, setExamesHist] = useState<Exame[]>([]);
  const [notasHist, setNotasHist] = useState<NotaExplicativa[]>([]);
  const [evolucoesHist, setEvolucoesHist] = useState<EvolucaoCaso[]>([]);
  const [roteirosList, setRoteirosList] = useState<RoteiroAnamnese[]>([]);

  // Edição de Consulta existente
  const [editingConsultaId, setEditingConsultaId] = useState<string | null>(null);
  const [editingConsultaData, setEditingConsultaData] = useState<string>('');

  // Abas da tela de Consulta
  const [activeSubTab, setActiveSubTab] = useState<'anamnese' | 'evolucao' | 'prontuario'>('anamnese');

  // Modais das Ações Principais
  const [isReceitaDigitalOpen, setIsReceitaDigitalOpen] = useState(false);
  const [isTermoModalOpen, setIsTermoModalOpen] = useState(false);
  const [termoInitialType, setTermoInitialType] = useState<ExtendedTipoDoc>('tcle_geral');
  const [isAuditoriaModalOpen, setIsAuditoriaModalOpen] = useState(false);
  const [isMedicamentosOpen, setIsMedicamentosOpen] = useState(false);
  const [isResiduosOpen, setIsResiduosOpen] = useState(false);
  const [isAnamneseModalOpen, setIsAnamneseModalOpen] = useState(false);
  const [selectedQueixaId, setSelectedQueixaId] = useState<string | null>(null);

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

  // Subscrição dos roteiros de anamnese
  useEffect(() => {
    const unsubRoteiros = subscribeRoteirosAnamnese(setRoteirosList);
    return () => unsubRoteiros();
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

  // Novas Seções de Exame Físico Aprimorado
  const [observacaoAntesToque, setObservacaoAntesToque] = useState<ObservacaoAntesToque>({
    estadoMental: 'Alerta',
    comportamento: 'Dócil',
    posturaMarcha: 'Normal',
    padraoRespiratorio: 'Eupneico',
    dorAparente: 'Ausente',
    observacoes: ''
  });

  const [estadoCorporalHidratacao, setEstadoCorporalHidratacao] = useState<EstadoCorporalHidratacao>({
    massaMuscular: 'Adequada',
    hidratacao: '0% (Hidratado)',
    turgorCutaneo: 'Imediato (<2s)',
    edemaPeriferico: 'Ausente',
    pesoComparado: 'Estável'
  });

  const [neurologicoBasico, setNeurologicoBasico] = useState<NeurologicoBasico>({
    nivelConsciencia: 'Normal/Alerta',
    posturaMarchaCoord: 'Normal',
    propriocepcao: 'Presente',
    nistagmoTremores: 'Ausente',
    respostaManipulacao: 'Normal',
    observacoes: ''
  });

  const [dorComportamento, setDorComportamento] = useState<DorEComportamento>({
    posturaCompativelDor: 'Não',
    alteracaoApetiteInteracao: 'Não',
    dorPalpacao: 'Ausente',
    marchaProtecao: 'Não',
    escalaDor: '0 - Sem Dor'
  });

  const [checklistFinalizacao, setChecklistFinalizacao] = useState<ChecklistFinalizacao>({
    achadosRegistrados: true,
    queixaCorrelacionada: true,
    dorAvaliada: true,
    examesDefinidos: false,
    orientacoesRetorno: false,
    prioridadeProximoPasso: ''
  });

  // Checklist por Sistema Corporal (13 Sistemas)
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

  // Helper para limpar formulário e iniciar nova consulta
  const handleClearConsultaForm = () => {
    setEditingConsultaId(null);
    setEditingConsultaData('');
    setSintomasPrincipais('');
    setHistoricoClinico('');
    setDiagnosticoSuspeito('');
    setCondutaTratamento('');
    setSelectedQueixaId(null);
    setTemperatura('');
    setFreqCardiaca('');
    setFreqRespiratoria('');
    setTpc('');
    setMucosas('');
    setDesidratacao('');
    setEcc('');
    setEscoreDor('');
    setPressaoSistolica('');
    setDietaAtual('');

    setObservacaoAntesToque({
      estadoMental: 'Alerta',
      comportamento: 'Dócil',
      posturaMarcha: 'Normal',
      padraoRespiratorio: 'Eupneico',
      dorAparente: 'Ausente',
      observacoes: ''
    });

    setEstadoCorporalHidratacao({
      massaMuscular: 'Adequada',
      hidratacao: '0% (Hidratado)',
      turgorCutaneo: 'Imediato (<2s)',
      edemaPeriferico: 'Ausente',
      pesoComparado: 'Estável'
    });

    setNeurologicoBasico({
      nivelConsciencia: 'Normal/Alerta',
      posturaMarchaCoord: 'Normal',
      propriocepcao: 'Presente',
      nistagmoTremores: 'Ausente',
      respostaManipulacao: 'Normal',
      observacoes: ''
    });

    setDorComportamento({
      posturaCompativelDor: 'Não',
      alteracaoApetiteInteracao: 'Não',
      dorPalpacao: 'Ausente',
      marchaProtecao: 'Não',
      escalaDor: '0 - Sem Dor'
    });

    setChecklistFinalizacao({
      achadosRegistrados: true,
      queixaCorrelacionada: true,
      dorAvaliada: true,
      examesDefinidos: false,
      orientacoesRetorno: false,
      prioridadeProximoPasso: ''
    });

    const init: Record<string, ExameFisicoItem> = {};
    SISTEMAS_CORP.forEach(s => {
      init[s] = { status: 'Normal', observacao: '' };
    });
    setExameSistemas(init);
  };

  const handleStartNewConsulta = () => {
    handleClearConsultaForm();
    const p = pacientes.find(item => item.id === currentPatientId);
    if (p && p.peso) {
      setPesoAtual(String(p.peso));
    }
    setActiveSubTab('anamnese');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Carrega histórico quando muda o paciente
  useEffect(() => {
    if (!currentPatientId) return;

    handleClearConsultaForm();

    const unsubCons = subscribeConsultasPaciente(currentPatientId, setConsultasHist);
    const unsubTerm = subscribeTermosAtendimento(currentPatientId, setTermosHist);
    const unsubReq = subscribeRequisicoesExames(currentPatientId, setRequisicoesHist);
    const unsubEx = subscribeExames(currentPatientId, setExamesHist);
    const unsubNotas = subscribeNotas(currentPatientId, setNotasHist);
    const unsubEvol = subscribeEvolucoesPaciente(currentPatientId, setEvolucoesHist);

    // Carrega peso inicial se paciente tiver peso
    const p = pacientes.find(item => item.id === currentPatientId);
    if (p && p.peso) {
      setPesoAtual(String(p.peso));
    }

    return () => {
      unsubCons();
      unsubTerm();
      unsubReq();
      unsubEx();
      unsubNotas();
      unsubEvol();
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

  // Helper para carregar consulta salva para edição
  const handleLoadConsultaForEdit = (consulta: ConsultaAtendimento) => {
    setEditingConsultaId(consulta.id);
    setEditingConsultaData(consulta.data || consulta.criadoEm);
    setSintomasPrincipais(consulta.sintomasPrincipais || '');
    setHistoricoClinico(consulta.historicoClinico || '');
    setPesoAtual(String(consulta.peso || ''));
    setDietaAtual(consulta.dieta || '');
    setDiagnosticoSuspeito(consulta.diagnostico || '');
    setCondutaTratamento(consulta.conduta || '');
    setSelectedQueixaId(consulta.queixaPrincipalId || null);
    setIsDomiciliar(!!consulta.isDomiciliar);
    if (consulta.distanciaKm !== undefined) setDistanciaKm(String(consulta.distanciaKm));
    if (consulta.valorConsulta !== undefined) setValorConsulta(String(consulta.valorConsulta));
    if (consulta.valorDeslocamento !== undefined) setValorDeslocamento(String(consulta.valorDeslocamento));

    if (consulta.parametrosVitais) {
      setTemperatura(String(consulta.parametrosVitais.temperatura || ''));
      setFreqCardiaca(String(consulta.parametrosVitais.freqCardiaca || ''));
      setFreqRespiratoria(String(consulta.parametrosVitais.freqRespiratoria || ''));
      setTpc(String(consulta.parametrosVitais.tpc || ''));
      setMucosas(consulta.parametrosVitais.mucosas || '');
      setDesidratacao(consulta.parametrosVitais.desidratacao || '');
      setEcc(String(consulta.parametrosVitais.ecc || ''));
      setEscoreDor(String(consulta.parametrosVitais.escoreDor || ''));
      setPressaoSistolica(String(consulta.parametrosVitais.pressaoSistolica || ''));
    }

    if (consulta.observacaoAntesToque) {
      setObservacaoAntesToque(consulta.observacaoAntesToque);
    }
    if (consulta.estadoCorporalHidratacao) {
      setEstadoCorporalHidratacao(consulta.estadoCorporalHidratacao);
    }
    if (consulta.neurologicoBasico) {
      setNeurologicoBasico(consulta.neurologicoBasico);
    }
    if (consulta.dorComportamento) {
      setDorComportamento(consulta.dorComportamento);
    }
    if (consulta.checklistFinalizacao) {
      setChecklistFinalizacao(consulta.checklistFinalizacao);
    }

    if (consulta.exameFisico) {
      setExameSistemas(consulta.exameFisico);
    }

    setActiveSubTab('anamnese');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

      const safeId = editingConsultaId || `cons_${Date.now()}`;

      const novaConsulta: ConsultaAtendimento = {
        id: safeId,
        pacienteId: currentPatientId,
        tutorId: currentPatient?.tutorId || '',
        data: editingConsultaData || new Date().toISOString().slice(0, 10),
        sintomasPrincipais: sintomasPrincipais.trim(),
        historicoClinico: historicoClinico.trim(),
        exameFisico: exameSistemas,
        parametrosVitais: parametrosVitaisObj,
        observacaoAntesToque,
        estadoCorporalHidratacao,
        neurologicoBasico,
        dorComportamento,
        checklistFinalizacao,
        queixaPrincipalId: selectedQueixaId || undefined,
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
      setEditingConsultaId(null);
      setEditingConsultaData('');
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
      tipo: 'consulta' | 'termo' | 'exame' | 'analise' | 'evolucao';
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

    // Requisições de Exames
    requisicoesHist.forEach(req => {
      items.push({
        id: req.id,
        tipo: 'termo',
        titulo: 'Requisição de Exames',
        data: req.criadoEm,
        detalhes: (req.indicacaoClinica ? req.indicacaoClinica + '\n\n' : '') + 'Exames Solicitados:\n' + (req.examesSelecionados || []).map((e: any) => `• ${e.nome}`).join('\n'),
        responsavel: req.criadoPor
      });
    });

    // Exames
    examesHist.forEach(e => {
      const isEnc = !!e.isEncaminhamento;
      const encInfo = isEnc && e.encaminhamento?.clinicaOrigem ? ` [Encaminhamento: ${e.encaminhamento.clinicaOrigem}]` : '';
      const encDetalhes = isEnc && e.encaminhamento
        ? ` Exame de encaminhamento de: ${e.encaminhamento.clinicaOrigem}${e.encaminhamento.crmvOrigem ? ` (CRMV: ${e.encaminhamento.crmvOrigem})` : ''}.${e.encaminhamento.motivoEncaminhamento ? ` Motivo: ${e.encaminhamento.motivoEncaminhamento}.` : ''}`
        : '';

      items.push({
        id: e.id,
        tipo: 'exame',
        titulo: `Exame Complementar: ${e.tipo}${encInfo}`,
        data: e.dataUpload,
        detalhes: `Arquivo anexado no prontuário.${encDetalhes}`
      });
    });

    // Notas Explicativas (Substituindo Análises IA Automáticas)
    notasHist.forEach(nota => {
      items.push({
        id: nota.id,
        tipo: 'analise', // mantendo o tipo visual como analise/ia
        titulo: 'Nota Explicativa (Assistida por IA)',
        data: nota.geradaEm,
        detalhes: nota.conteudo || 'Nota adicionada ao prontuário.'
      });
    });

    // Evoluções do Caso
    evolucoesHist.forEach(ev => {
      const refCons = consultasHist.find(c => c.id === ev.consultaReferenciaId);
      const refDateStr = refCons ? (refCons.data || refCons.criadoEm.slice(0, 10)) : null;
      const refDateFormatted = refDateStr ? new Date(refDateStr).toLocaleDateString('pt-BR') : null;
      const refInfo = refDateFormatted ? ` [Ref: Consulta de ${refDateFormatted}]` : '';

      items.push({
        id: ev.id,
        tipo: 'evolucao',
        titulo: `Evolução do Caso${refInfo}`,
        data: ev.criadoEm || ev.data,
        detalhes: ev.texto + (ev.condutaAjustada ? `\n\nConduta Ajustada: ${ev.condutaAjustada}` : ''),
        responsavel: ev.registradoPor
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
  }, [consultasHist, termosHist, requisicoesHist, examesHist, notasHist, evolucoesHist, searchProntuario, filtroTipo]);

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
                    className="appearance-none font-bold text-slate-800 text-lg bg-transparent pr-8 cursor-pointer focus:outline-none hover:text-teal-600 transition-colors"
                  >
                    {pacientes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} ({p.especie} - {p.raca})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {currentPatient && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Tutor: {currentTutor?.nomeCompleto || 'Não informado'}
                  </span>
                  {currentTutor?.telefone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {currentTutor.telefone}
                    </span>
                  )}
                  <span>• Sexo: <strong>{currentPatient.sexo}</strong></span>
                  <span>• Idade: <strong>{currentPatient.idade}</strong></span>
                  <span>• Peso: <strong>{pesoAtual || currentPatient.peso || '—'} kg</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Botões de Ações Rápidas (Receita, Termos e Auditoria) */}
          <div className="flex flex-wrap items-center gap-3">
            {/* 1. Botão "Receita Digital ICP-Brasil" */}
            <button
              onClick={() => setIsReceitaDigitalOpen(true)}
              disabled={!currentPatientId}
              className="px-4 py-2.5 rounded-xl border border-teal-500 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4 text-white" />
              Receita Digital ICP-Brasil
            </button>

            {/* 2. Botão "Receita Tradicional" */}
            <button
              onClick={() => {
                setTermoInitialType('receita_simples');
                setIsTermoModalOpen(true);
              }}
              disabled={!currentPatientId}
              className="px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Pill className="w-4 h-4 text-emerald-600" />
              Receita Impressa
            </button>

            {/* 2. Botão "Termo / Documento" */}
            <button
              onClick={() => {
                setTermoInitialType('tcle_geral');
                setIsTermoModalOpen(true);
              }}
              disabled={!currentPatientId}
              className="px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
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

        {/* Abas de Navegação Interna: Anamnese vs Evolução vs Prontuário + Botão + Nova Consulta */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 mt-6 pt-4">
          <div className="flex flex-wrap items-center gap-2">
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
              onClick={() => setActiveSubTab('evolucao')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeSubTab === 'evolucao'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Evolução do Caso ({evolucoesHist.length})
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

          {/* Botão Nova Consulta / Novo Atendimento */}
          <button
            onClick={handleStartNewConsulta}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Nova Consulta (Novo Atendimento)
          </button>
        </div>
      </div>

      {/* ── CONTEÚDO DA ABA 1: ANAMNESE E EXAME FÍSICO ────────────────────────── */}
      {activeSubTab === 'anamnese' && (
        <form onSubmit={handleSaveConsulta} className="space-y-6">

          {/* Banner de Modo: Edição de Consulta Passada vs Nova Consulta em Branco */}
          {editingConsultaId ? (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-amber-900 shadow-sm animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Modo de Edição de Consulta Registrada</p>
                  <p className="text-xs text-slate-600">
                    Você está alterando a consulta do dia <span className="font-semibold">{editingConsultaData || 'selecionado'}</span> (ID: <span className="font-mono">{editingConsultaId}</span>). As alterações atualizarão este atendimento específico.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleStartNewConsulta}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Iniciar Nova Consulta em Branco
              </button>
            </div>
          ) : (
            <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-emerald-950 shadow-sm animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-700 flex items-center justify-center shrink-0">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-950">Nova Consulta em Branco — {new Date().toLocaleDateString('pt-BR')}</p>
                  <p className="text-xs text-emerald-800">
                    Registrando um novo atendimento clínico para a visita de hoje. Ao salvar, um novo documento datado será adicionado ao histórico do paciente.
                  </p>
                </div>
              </div>

              {consultasHist.length > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-slate-600">Atendimentos anteriores:</span>
                  <select
                    value=""
                    onChange={(e) => {
                      const selected = consultasHist.find(c => c.id === e.target.value);
                      if (selected) handleLoadConsultaForEdit(selected);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-white text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                  >
                    <option value="" disabled>Ver/Editar atendimento passado...</option>
                    {consultasHist.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.data || c.criadoEm.slice(0, 10)} — {c.sintomasPrincipais?.slice(0, 25) || 'Atendimento'}...
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
          
          {/* Card: Queixa Principal e Histórico Clínico */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-teal-600" />
                  1. Anamnese do Paciente
                </h3>
                <p className="text-xs text-slate-500">
                  Preencha com o auxílio do roteiro guiado ou digite livremente.
                </p>
              </div>

              {/* Botão Roteiro Guiado */}
              <button
                type="button"
                onClick={() => setIsAnamneseModalOpen(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-teal-700/20 flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto group"
              >
                <Sparkles className="w-4 h-4 text-teal-200 group-hover:rotate-12 transition-transform" />
                <span>Usar Roteiro Guiado por Queixa (30 Roteiros)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Sintomas Principais / Motivo da Consulta *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAnamneseModalOpen(true)}
                    className="text-[11px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    Abrir Roteiro
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={sintomasPrincipais}
                  onChange={e => setSintomasPrincipais(e.target.value)}
                  placeholder="Ex: Vômito persistente há 2 dias, letargia e recusa alimentar..."
                  className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Histórico Clínico e Manejo
                </label>
                <textarea
                  rows={4}
                  value={historicoClinico}
                  onChange={e => setHistoricoClinico(e.target.value)}
                  placeholder="Ex: Vacinação em dia, vermifugado no mês passado, sem alergias prévias relatadas..."
                  className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* Parâmetros Vitais Rápidos e Nutrição */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
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
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none font-semibold text-slate-800"
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
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* ── CARD: EXAME FÍSICO APRIMORADO ─────────────────────────────────── */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-teal-600" />
                  2. Exame Físico Completo
                </h3>
                <p className="text-xs text-slate-500">
                  Avaliação estruturada: Observação à distância, Parâmetros vitais, Neurológico, Dor e 13 Sistemas.
                </p>
              </div>

              <span className="text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
                Checklist Profissional
              </span>
            </div>

            {/* SEÇÃO 2.1: Observação Antes do Toque (Visual à Distância) */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  2.1 Observação Antes do Toque (Avaliação Visual / À Distância)
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Estado Mental / Interação
                  </label>
                  <select
                    value={observacaoAntesToque.estadoMental || ''}
                    onChange={e => setObservacaoAntesToque(prev => ({ ...prev, estadoMental: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-800 font-medium"
                  >
                    <option value="Alerta">Alerta</option>
                    <option value="Apático">Apático</option>
                    <option value="Deprimido">Deprimido</option>
                    <option value="Estuporoso">Estuporoso</option>
                    <option value="Comatoso">Comatoso</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Comportamento no Ambiente
                  </label>
                  <select
                    value={observacaoAntesToque.comportamento || ''}
                    onChange={e => setObservacaoAntesToque(prev => ({ ...prev, comportamento: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-800 font-medium"
                  >
                    <option value="Dócil">Dócil / Calmo</option>
                    <option value="Assustado">Assustado / Medroso</option>
                    <option value="Inquieto">Inquieto / Agitado</option>
                    <option value="Agressivo">Agressivo / Reativo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Postura e Marcha Espontânea
                  </label>
                  <select
                    value={observacaoAntesToque.posturaMarcha || ''}
                    onChange={e => setObservacaoAntesToque(prev => ({ ...prev, posturaMarcha: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-800 font-medium"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Claudicação">Claudicação / Mancando</option>
                    <option value="Cifose">Cifose / Dor de Coluna</option>
                    <option value="Ataxia">Ataxia / Descoordenação</option>
                    <option value="Decúbito">Decúbito Obrigatório</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Padrão Respiratório à Distância
                  </label>
                  <select
                    value={observacaoAntesToque.padraoRespiratorio || ''}
                    onChange={e => setObservacaoAntesToque(prev => ({ ...prev, padraoRespiratorio: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-800 font-medium"
                  >
                    <option value="Eupneico">Eupneico (Normal)</option>
                    <option value="Taquipneico">Taquipneico (Acelerado)</option>
                    <option value="Dispneico">Dispneico / Esforço</option>
                    <option value="Abdominal">Padrão Abdominal / Paradoxal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Dor Aparente / Proteção de Região
                  </label>
                  <select
                    value={observacaoAntesToque.dorAparente || ''}
                    onChange={e => setObservacaoAntesToque(prev => ({ ...prev, dorAparente: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-800 font-medium"
                  >
                    <option value="Ausente">Ausente</option>
                    <option value="Leve">Leve</option>
                    <option value="Moderada">Moderada</option>
                    <option value="Intensa">Intensa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Observações Visuais Adicionais
                  </label>
                  <input
                    type="text"
                    value={observacaoAntesToque.observacoes || ''}
                    onChange={e => setObservacaoAntesToque(prev => ({ ...prev, observacoes: e.target.value }))}
                    placeholder="Ex: Tremores finos de repouso..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 2.2: Parâmetros Vitais, Estado Corporal & Hidratação */}
            <div className="bg-rose-50/30 border border-rose-100 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-500" />
                <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wider">
                  2.2 Parâmetros Vitais, Estado Corporal & Hidratação
                </h4>
              </div>

              {/* Grid dos Vitais */}
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
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Movimentos respiratórios/min</span>
                </div>

                {/* 4. Tempo de Preenchimento Capilar (TPC) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    TPC (segundos)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={tpc}
                    onChange={e => setTpc(e.target.value)}
                    placeholder="Ex: 1.5"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none font-semibold text-slate-800 bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Normal: até 2s</span>
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
                    <option value="Rosadas">Rosadas (Normocoradas)</option>
                    <option value="Pálidas">Pálidas (Hipocoradas)</option>
                    <option value="Ictéricas">Ictéricas</option>
                    <option value="Cianóticas">Cianóticas</option>
                    <option value="Congestas">Congestas (Hiperêmicas)</option>
                  </select>
                </div>

                {/* 6. Pressão Sistólica */}
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
                </div>
              </div>

              {/* Sub-bloco: Condição Corporal e Hidratação */}
              <div className="pt-3 border-t border-rose-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    ECC (Escore de Condição Corporal)
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
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Massa Muscular
                  </label>
                  <select
                    value={estadoCorporalHidratacao.massaMuscular || ''}
                    onChange={e => setEstadoCorporalHidratacao(prev => ({ ...prev, massaMuscular: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none font-medium text-slate-800 bg-white cursor-pointer"
                  >
                    <option value="Adequada">Adequada / Preservada</option>
                    <option value="Hipotrofia Leve">Hipotrofia Leve</option>
                    <option value="Atrofia Moderada/Grave">Atrofia Moderada/Grave</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Grau de Desidratação
                  </label>
                  <select
                    value={desidratacao}
                    onChange={e => {
                      setDesidratacao(e.target.value);
                      setEstadoCorporalHidratacao(prev => ({ ...prev, hidratacao: e.target.value }));
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none font-medium text-slate-800 bg-white cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    <option value="0% (hidratado)">0% (Hidratado)</option>
                    <option value="5%">5% (Desidratação Leve)</option>
                    <option value="8%">8% (Desidratação Moderada)</option>
                    <option value="10%+">10%+ (Desidratação Grave)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Turgor Cutâneo
                  </label>
                  <select
                    value={estadoCorporalHidratacao.turgorCutaneo || ''}
                    onChange={e => setEstadoCorporalHidratacao(prev => ({ ...prev, turgorCutaneo: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none font-medium text-slate-800 bg-white cursor-pointer"
                  >
                    <option value="Imediato (<2s)">Imediato (&lt;2s)</option>
                    <option value="Retardado (2-4s)">Retardado (2–4s)</option>
                    <option value="Muito Retardado (>4s)">Muito Retardado (&gt;4s)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Edema Periférico
                  </label>
                  <select
                    value={estadoCorporalHidratacao.edemaPeriferico || ''}
                    onChange={e => setEstadoCorporalHidratacao(prev => ({ ...prev, edemaPeriferico: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none font-medium text-slate-800 bg-white cursor-pointer"
                  >
                    <option value="Ausente">Ausente</option>
                    <option value="Presente">Presente (Membros/Subcutâneo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Peso Comparado ao Histórico
                  </label>
                  <select
                    value={estadoCorporalHidratacao.pesoComparado || ''}
                    onChange={e => setEstadoCorporalHidratacao(prev => ({ ...prev, pesoComparado: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none font-medium text-slate-800 bg-white cursor-pointer"
                  >
                    <option value="Estável">Estável</option>
                    <option value="Perda de Peso">Perda de Peso Recente</option>
                    <option value="Ganho de Peso">Ganho de Peso Recente</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2.3: Exame Neurológico Básico */}
            <div className="bg-purple-50/30 border border-purple-100 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-600" />
                <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                  2.3 Exame Neurológico Básico
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Nível de Consciência
                  </label>
                  <select
                    value={neurologicoBasico.nivelConsciencia || ''}
                    onChange={e => setNeurologicoBasico(prev => ({ ...prev, nivelConsciencia: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-800 font-medium"
                  >
                    <option value="Normal/Alerta">Normal / Alerta</option>
                    <option value="Obnubilado">Obnubilado / Torporoso</option>
                    <option value="Estupor">Estupor</option>
                    <option value="Coma">Coma</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Postura, Marcha e Coordenação
                  </label>
                  <select
                    value={neurologicoBasico.posturaMarchaCoord || ''}
                    onChange={e => setNeurologicoBasico(prev => ({ ...prev, posturaMarchaCoord: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-800 font-medium"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Ataxia">Ataxia (Proprioceptiva/Vestibular/Cerebelar)</option>
                    <option value="Paresia">Paresia (Monoparesia/Paraparesia/Tetraparesia)</option>
                    <option value="Paralisia">Paralisia / Plegia</option>
                    <option value="Head Tilt">Head Tilt (Inclinação de Cabeça)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Propriocepção (Reações Posturais)
                  </label>
                  <select
                    value={neurologicoBasico.propriocepcao || ''}
                    onChange={e => setNeurologicoBasico(prev => ({ ...prev, propriocepcao: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-800 font-medium"
                  >
                    <option value="Presente">Presente (Normal nos 4 membros)</option>
                    <option value="Diminuída">Diminuída (Déficit proprioceptivo)</option>
                    <option value="Ausente">Ausente</option>
                    <option value="Não avaliada">Não avaliada nesta consulta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Nistagmo / Tremores
                  </label>
                  <select
                    value={neurologicoBasico.nistagmoTremores || ''}
                    onChange={e => setNeurologicoBasico(prev => ({ ...prev, nistagmoTremores: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-800 font-medium"
                  >
                    <option value="Ausente">Ausente</option>
                    <option value="Nistagmo">Nistagmo Patológico</option>
                    <option value="Tremores de intenção">Tremores de Intenção</option>
                    <option value="Fasciculações">Fasciculações / Mioclonias</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Resposta à Manipulação / Dor
                  </label>
                  <select
                    value={neurologicoBasico.respostaManipulacao || ''}
                    onChange={e => setNeurologicoBasico(prev => ({ ...prev, respostaManipulacao: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-800 font-medium"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Hiperestesia">Hiperestesia (Hipersensibilidade)</option>
                    <option value="Hipoestesia">Hipoestesia / Perda de sensibilidade</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Observações Neurológicas
                  </label>
                  <input
                    type="text"
                    value={neurologicoBasico.observacoes || ''}
                    onChange={e => setNeurologicoBasico(prev => ({ ...prev, observacoes: e.target.value }))}
                    placeholder="Ex: Reflexos espinhais testados..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 2.4: Dor e Comportamento */}
            <div className="bg-amber-50/40 border border-amber-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Smile className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  2.4 Avaliação de Dor e Comportamento
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Postura Compatível com Dor
                  </label>
                  <select
                    value={dorComportamento.posturaCompativelDor || ''}
                    onChange={e => setDorComportamento(prev => ({ ...prev, posturaCompativelDor: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-800 font-medium"
                  >
                    <option value="Não">Não</option>
                    <option value="Sim (Cifose/Reza/Prostração)">Sim (Cifose / Reza / Prostração)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Alteração de Apetite / Interação
                  </label>
                  <select
                    value={dorComportamento.alteracaoApetiteInteracao || ''}
                    onChange={e => setDorComportamento(prev => ({ ...prev, alteracaoApetiteInteracao: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-800 font-medium"
                  >
                    <option value="Não">Não</option>
                    <option value="Sim">Sim (Inapetência / Isolamento)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Dor à Palpação
                  </label>
                  <select
                    value={dorComportamento.dorPalpacao || ''}
                    onChange={e => setDorComportamento(prev => ({ ...prev, dorPalpacao: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-800 font-medium"
                  >
                    <option value="Ausente">Ausente</option>
                    <option value="Abdominal">Abdominal</option>
                    <option value="Coluna/Lombar">Coluna / Lombar</option>
                    <option value="Articular">Articular / Membros</option>
                    <option value="Músculo">Muscular Difusa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Marcha de Proteção de Região
                  </label>
                  <select
                    value={dorComportamento.marchaProtecao || ''}
                    onChange={e => setDorComportamento(prev => ({ ...prev, marchaProtecao: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-800 font-medium"
                  >
                    <option value="Não">Não</option>
                    <option value="Sim">Sim (Evita apoiar membro/região)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Escore de Dor (Escala 0 a 4)
                  </label>
                  <select
                    value={escoreDor}
                    onChange={e => {
                      setEscoreDor(e.target.value);
                      setDorComportamento(prev => ({ ...prev, escalaDor: e.target.value }));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-800 font-medium"
                  >
                    <option value="">Selecione...</option>
                    <option value="0">0 — Sem Dor</option>
                    <option value="1">1 — Dor Leve</option>
                    <option value="2">2 — Dor Moderada</option>
                    <option value="3">3 — Dor Severa</option>
                    <option value="4">4 — Dor Excruciante</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2.5: Checklist por 13 Sistemas Corporais */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    2.5 Exame Físico por 13 Sistemas Corporais
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Marque cada sistema como <strong>Normal</strong> ou <strong>Alterado</strong>. Sistemas alterados abrem campo de anotação.
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-400">13 Sistemas</span>
              </div>

              {/* Grid dos 13 Sistemas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isAlterado 
                                ? 'bg-amber-600 text-white shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            Alterado
                          </button>
                        </div>
                      </div>

                      {/* Campo de Nota Curta */}
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

            {/* SEÇÃO 2.6: Checklist Antes de Finalizar */}
            <div className="bg-teal-50/50 border border-teal-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-teal-600" />
                <h4 className="text-xs font-bold text-teal-950 uppercase tracking-wider">
                  2.6 Checklist "Antes de Finalizar o Exame Físico"
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                {[
                  { key: 'achadosRegistrados', label: 'Achados anormais registrados' },
                  { key: 'queixaCorrelacionada', label: 'Queixa correlacionada aos achados' },
                  { key: 'dorAvaliada', label: 'Dor avaliada e documentada' },
                  { key: 'examesDefinidos', label: 'Exames definidos (se indicados)' },
                  { key: 'orientacoesRetorno', label: 'Orientações e retorno registrados' }
                ].map(item => {
                  const isChecked = !!(checklistFinalizacao as any)[item.key];
                  return (
                    <div
                      key={item.key}
                      onClick={() => setChecklistFinalizacao(prev => ({ ...prev, [item.key]: !isChecked }))}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-teal-600 text-white font-bold border-teal-600 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-white shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2">
                <label className="block text-[11px] font-bold text-teal-900 uppercase tracking-wider mb-1">
                  Prioridade Clínica / Próximo Passo
                </label>
                <input
                  type="text"
                  value={checklistFinalizacao.prioridadeProximoPasso || ''}
                  onChange={e => setChecklistFinalizacao(prev => ({ ...prev, prioridadeProximoPasso: e.target.value }))}
                  placeholder="Ex: Estabilização imediata com fluidoterapia; aguardar resultado de US..."
                  className="w-full px-3.5 py-2 rounded-xl border border-teal-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-teal-500 outline-none font-medium"
                />
              </div>
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

      {/* ── CONTEÚDO DA ABA 2: EVOLUÇÃO DO CASO (ACOMPANHAMENTO) ────────────────── */}
      {activeSubTab === 'evolucao' && (
        <EvolucaoCasoModule
          patientId={currentPatientId}
          patientName={currentPatient?.nome}
          pacientes={pacientes}
          consultasHist={consultasHist}
          tutorId={currentPatient?.tutorId}
          examesHist={examesHist}
          evolucoes={evolucoesHist}
          userProfile={userProfile}
          onSaveEvolucao={async (data) => {
            await saveEvolucaoCaso({ ...data, pacienteId: currentPatientId });
          }}
        />
      )}

      {/* ── CONTEÚDO DA ABA 3: PRONTUÁRIO / LINHA DO TEMPO UNIFICADA ──────────── */}
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
                <option value="evolucao">Apenas Evoluções</option>
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
                  analise: 'bg-purple-100 text-purple-700 border-purple-200',
                  evolucao: 'bg-amber-100 text-amber-800 border-amber-300'
                }[item.tipo];

                const IconComponent = {
                  consulta: Stethoscope,
                  termo: FileSignature,
                  exame: FileText,
                  analise: Sparkles,
                  evolucao: TrendingUp
                }[item.tipo];

                return (
                  <div key={item.id} className="relative flex items-start gap-4 pl-2 group">
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 z-10 bg-white ${badgeBg}`}>
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>

                    <div className="bg-slate-50/80 hover:bg-slate-50 p-4 rounded-2xl border border-slate-200 flex-1 transition-all">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800">
                            {item.titulo}
                          </span>
                          {item.tipo === 'consulta' && (
                            <button
                              type="button"
                              onClick={() => {
                                const c = consultasHist.find(cons => cons.id === item.id);
                                if (c) handleLoadConsultaForEdit(c);
                              }}
                              className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-bold border border-teal-200 flex items-center gap-1 transition-all"
                            >
                              <Edit className="w-3 h-3" />
                              Editar
                            </button>
                          )}
                        </div>
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

                      <p className="text-xs text-slate-600 leading-relaxed mt-1 whitespace-pre-wrap">
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

      {/* ── MODAL: RECEITA DIGITAL ICP-BRASIL ─────────────────────────── */}
      {isReceitaDigitalOpen && (
        <ReceitaDigitalModal
          isOpen={isReceitaDigitalOpen}
          onClose={() => setIsReceitaDigitalOpen(false)}
          pacienteId={currentPatientId}
          pacienteNome={currentPatient?.nome}
          pacienteEspecie={currentPatient?.especie}
          pacienteRaca={currentPatient?.raca}
          pacienteIdade={currentPatient?.idade?.toString()}
          pacientePeso={currentPatient?.peso || pesoAtual}
          tutorNome={currentTutor?.nomeCompleto}
          tutorCpf={currentTutor?.cpf}
          tutorTelefone={currentTutor?.telefone}
          tutorEndereco={currentTutor?.endereco}
          atendimentoId={editingConsultaId || currentPatientId}
          userProfile={userProfile}
        />
      )}

      {/* ── MODAL: TERMO / DOCUMENTO (GERARDOCUMENTOMODAL) ──────────────────── */}
      {isTermoModalOpen && (
        <GerarDocumentoModal
          clientId={currentPatientId}
          atendimentoId={currentPatientId}
          initialType={termoInitialType}
          patientName={currentPatient?.nome}
          tutorName={currentTutor?.nomeCompleto}
          tutorData={{
            nome: currentTutor?.nomeCompleto,
            cpf: currentTutor?.cpf,
            telefone: currentTutor?.telefone,
            endereco: currentTutor?.endereco,
          }}
          userProfile={userProfile}
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

      {/* ── MODAL: ANAMNESE GUIADA (30 ROTEIROS) ─────────────────────────────── */}
      <AnamneseGuiadaModal
        isOpen={isAnamneseModalOpen}
        onClose={() => setIsAnamneseModalOpen(false)}
        roteiros={roteirosList}
        currentSintomas={sintomasPrincipais}
        initialQueixaId={selectedQueixaId || undefined}
        onApplyResumo={(novoTexto, modo) => {
          if (modo === 'substituir') {
            setSintomasPrincipais(novoTexto);
          } else {
            setSintomasPrincipais(prev => prev.trim() ? `${prev.trim()}\n\n${novoTexto}` : novoTexto);
          }
        }}
      />

    </div>
  );
}
