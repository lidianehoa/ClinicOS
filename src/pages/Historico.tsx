import { useState, useEffect, useMemo } from 'react';
import {
  History,
  Search,
  Calendar,
  Stethoscope,
  FileSignature,
  Syringe,
  FileText,
  Sparkles,
  User,
  PawPrint,
  Clock,
  ChevronRight,
  X,
  Pill,
  ExternalLink,
  Download
} from 'lucide-react';
import {
  subscribePacientes,
  subscribeResponsaveis,
  subscribeAllConsultasAtendimento,
  subscribeAllTermosAtendimento,
  subscribeAllMedicamentosAplicados,
  subscribeAllExames,
  subscribeAllAnalises,
  subscribeAllReceitas,
  type Paciente,
  type Responsavel,
  type ConsultaAtendimento,
  type TermoAtendimento,
  type MedicamentoAplicado,
  type Exame,
  type AnaliseClinica,
  type ReceitaDigital,
  type AppUser
} from '../services/dataService';

/** Texto curto do atendimento Petlove para o histórico */
const textoPetlove = (a?: { numero?: string; coparticipacao?: number; procedimento?: string }) =>
  a?.numero
    ? ` Petlove: atendimento nº ${a.numero}${a.procedimento ? ` (${a.procedimento})` : ''}${
        a.coparticipacao != null ? `, coparticipação R$ ${Number(a.coparticipacao).toFixed(2).replace('.', ',')}` : ''
      }.`
    : '';


interface HistoricoProps {
  userProfile?: AppUser | null;
}

export type TipoHistoricoItem = 'consulta' | 'termo' | 'medicamento' | 'exame' | 'analise' | 'receita';

export interface FeedItem {
  id: string;
  tipo: TipoHistoricoItem;
  titulo: string;
  subtitulo: string;
  pacienteNome: string;
  pacienteEspecie?: string;
  pacienteId?: string;
  tutorNome: string;
  tutorId?: string;
  dataHora: string; // ISO string
  resumo: string;
  veterinario?: string;
  valor?: number;
  tags?: string[];
  raw?: any;
}

const MESES = [
  { id: '01', nome: 'Janeiro' },
  { id: '02', nome: 'Fevereiro' },
  { id: '03', nome: 'Março' },
  { id: '04', nome: 'Abril' },
  { id: '05', nome: 'Maio' },
  { id: '06', nome: 'Junho' },
  { id: '07', nome: 'Julho' },
  { id: '08', nome: 'Agosto' },
  { id: '09', nome: 'Setembro' },
  { id: '10', nome: 'Outubro' },
  { id: '11', nome: 'Novembro' },
  { id: '12', nome: 'Dezembro' },
];

export default function Historico({ userProfile: _userProfile }: HistoricoProps) {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([]);
  const [consultas, setConsultas] = useState<ConsultaAtendimento[]>([]);
  const [termos, setTermos] = useState<TermoAtendimento[]>([]);
  const [medicamentos, setMedicamentos] = useState<MedicamentoAplicado[]>([]);
  const [exames, setExames] = useState<Exame[]>([]);
  const [analises, setAnalises] = useState<AnaliseClinica[]>([]);
  const [receitas, setReceitas] = useState<ReceitaDigital[]>([]);

  // Filtros de busca
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroAno, setFiltroAno] = useState<string>('todos');
  const [filtroMes, setFiltroMes] = useState<string>('todos');

  // Item selecionado para visualização em modal
  const [itemDetalhe, setItemDetalhe] = useState<FeedItem | null>(null);

  // Carregamento de dados em tempo real
  useEffect(() => {
    const unsubs: (() => void)[] = [];
    unsubs.push(subscribePacientes(setPacientes));
    unsubs.push(subscribeResponsaveis(setResponsaveis));
    unsubs.push(subscribeAllConsultasAtendimento(setConsultas));
    unsubs.push(subscribeAllTermosAtendimento(setTermos));
    unsubs.push(subscribeAllMedicamentosAplicados(setMedicamentos));
    unsubs.push(subscribeAllExames(setExames));
    unsubs.push(subscribeAllAnalises(setAnalises));
    unsubs.push(subscribeAllReceitas(setReceitas));

    return () => unsubs.forEach(u => u());
  }, []);

  // Mapeamento rápido de IDs para Pacientes e Tutores
  const { pacienteMap, tutorMap } = useMemo(() => {
    const pMap = new Map<string, Paciente>();
    pacientes.forEach(p => pMap.set(p.id, p));

    const tMap = new Map<string, Responsavel>();
    responsaveis.forEach(r => tMap.set(r.id, r));

    return { pacienteMap: pMap, tutorMap: tMap };
  }, [pacientes, responsaveis]);

  // Agregação Unificada de Todos os Registros Clínicos da Clínica
  const todosEventos = useMemo(() => {
    const feed: FeedItem[] = [];

    // 1. Consultas Clínicas
    consultas.forEach(c => {
      const p = pacienteMap.get(c.pacienteId);
      const t = p ? tutorMap.get(p.tutorId) : (c.tutorId ? tutorMap.get(c.tutorId) : null);
      
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

      feed.push({
        id: `cons_${c.id}`,
        tipo: 'consulta',
        titulo: 'Consulta Clínica & Anamnese',
        subtitulo: c.isDomiciliar ? 'Atendimento Domiciliar' : 'Atendimento Ambulatorial',
        pacienteNome: p?.nome || 'Paciente Clínico',
        pacienteEspecie: p?.especie,
        pacienteId: c.pacienteId,
        tutorNome: t?.nomeCompleto || 'Tutor Responsável',
        tutorId: t?.id,
        dataHora: c.criadoEm || `${c.data}T12:00:00Z`,
        resumo: `Sintomas: ${c.sintomasPrincipais || 'Sem queixas agudas'}.${vitaisStr} ${alterados.length > 0 ? `Sistemas com alteração: ${alterados.join(', ')}.` : 'Exame físico sem alterações.'} Conduta: ${c.conduta || 'Rotina.'}${textoPetlove(c.atendimentoPetlove)}`,
        veterinario: c.veterinarioNome,
        valor: c.valorTotal || c.valorConsulta,
        tags: [...(c.isDomiciliar ? ['Domiciliar', 'Presencial'] : ['Ambulatorial']), ...(c.atendimentoPetlove?.numero ? ['Petlove'] : [])],
        raw: c
      });
    });

    // 2. Termos e Receitas
    termos.forEach(t => {
      const p = pacienteMap.get(t.pacienteId);
      const tutor = p ? tutorMap.get(p.tutorId) : null;
      const isReceita = t.tipo === 'receita_simples' || t.tipo === 'receita_manipulada';

      feed.push({
        id: `term_${t.id}`,
        tipo: 'termo',
        titulo: isReceita ? (t.tipo === 'receita_simples' ? 'Receituário Simples' : 'Receituário Magistral') : `Termo: ${t.tipo.replace(/_/g, ' ').toUpperCase()}`,
        subtitulo: t.isControlado ? `Controlado · SIPEAGRO: ${t.numeroNotificacaoSipeagro || 'N/A'}` : 'Documento Registrado',
        pacienteNome: p?.nome || 'Paciente',
        pacienteEspecie: p?.especie,
        pacienteId: t.pacienteId,
        tutorNome: tutor?.nomeCompleto || 'Tutor',
        tutorId: tutor?.id,
        dataHora: t.geradoEm,
        resumo: t.conteudoClinico || t.baseLegal,
        veterinario: t.geradoPor,
        tags: t.isControlado ? ['SIPEAGRO', 'Controlado'] : ['Documento Legal'],
        raw: t
      });
    });

    // 3. Medicamentos Aplicados
    medicamentos.forEach(m => {
      const p = pacienteMap.get(m.atendimentoId);
      const tutor = p ? tutorMap.get(p.tutorId) : null;

      feed.push({
        id: `med_${m.id}`,
        tipo: 'medicamento',
        titulo: `Aplicação: ${m.farmaco}`,
        subtitulo: `${m.dose} · Via ${m.viaAdministracao}`,
        pacienteNome: p?.nome || 'Paciente',
        pacienteEspecie: p?.especie,
        pacienteId: p?.id,
        tutorNome: tutor?.nomeCompleto || 'Tutor',
        tutorId: tutor?.id,
        dataHora: m.horario,
        resumo: `Administração de ${m.farmaco} (${m.dose}) via ${m.viaAdministracao}. ${m.envolveSedacao ? 'Procedimento sob contenção/sedação.' : ''}`,
        veterinario: m.veterinarioNome,
        tags: m.envolveSedacao ? ['Sedação', 'Fármaco'] : ['Fármaco'],
        raw: m
      });
    });

    // 4. Exames Complementares
    exames.forEach(e => {
      const p = pacienteMap.get(e.pacienteId);
      const tutor = p ? tutorMap.get(p.tutorId) : null;
      const isEnc = !!e.isEncaminhamento;
      const encOrigem = e.encaminhamento?.clinicaOrigem;

      feed.push({
        id: `ex_${e.id}`,
        tipo: 'exame',
        titulo: `Exame: ${e.tipo}${isEnc ? ' (Encaminhamento)' : ''}`,
        subtitulo: isEnc ? `Encaminhado por: ${encOrigem || 'Clínica Externa'}` : 'Arquivo Anexado',
        pacienteNome: p?.nome || 'Paciente',
        pacienteEspecie: p?.especie,
        pacienteId: e.pacienteId,
        tutorNome: tutor?.nomeCompleto || 'Tutor',
        tutorId: tutor?.id,
        dataHora: e.dataUpload,
        resumo: `Exame complementar arquivado no prontuário digital.${isEnc ? ` Origem: ${encOrigem || 'Externa'}${e.encaminhamento?.crmvOrigem ? ` (CRMV: ${e.encaminhamento.crmvOrigem})` : ''}.${e.encaminhamento?.motivoEncaminhamento ? ` Motivo: ${e.encaminhamento.motivoEncaminhamento}.` : ''}` : ''}`,
        tags: isEnc ? ['Exame', 'Encaminhamento', e.tipo] : ['Exame', e.tipo],
        raw: e
      });
    });

    // 5. Análises Assistidas IA
    analises.forEach(a => {
      const aRaw = a as any;
      const p = aRaw.pacienteId ? pacienteMap.get(aRaw.pacienteId) : null;
      const tutor = p ? tutorMap.get(p.tutorId) : null;

      feed.push({
        id: `an_${a.id}`,
        tipo: 'analise',
        titulo: `Análise ClinicOS IA #${a.numero || 1}`,
        subtitulo: 'Inteligência Artificial Clínica',
        pacienteNome: p?.nome || 'Paciente',
        pacienteEspecie: p?.especie,
        pacienteId: aRaw.pacienteId,
        tutorNome: tutor?.nomeCompleto || 'Tutor',
        tutorId: tutor?.id,
        dataHora: a.dataAnalise,
        resumo: a.interpretacaoClinica || aRaw.condutaSugerida || (a.achados && a.achados.join('; ')) || 'Análise clínica estruturada.',
        tags: ['IA', 'Diagnóstico'],
        raw: a
      });
    });

    // 6. Receitas Digitais ICP-Brasil
    receitas.forEach(r => {
      const p = pacienteMap.get(r.pacienteId);
      const tutor = p ? tutorMap.get(p.tutorId) : null;
      const isAssinada = r.status === 'assinada';
      const statusLabel = r.status === 'importada'
        ? `Importada${r.origemExterna ? ` · ${r.origemExterna}` : ''}`
        : r.status === 'assinada'
        ? 'Assinada (ICP-Brasil)'
        : r.status === 'aguardando_assinatura'
        ? 'Aguardando Assinatura'
        : r.status === 'substituida'
        ? 'Substituída'
        : 'Rascunho';

      const tags = ['Receita', statusLabel];
      if (isAssinada || r.assinadaExternamente) tags.push('ICP-Brasil');
      if (r.isControlado) tags.push('Controle especial');
      if (r.tipo === 'receita_manipulada') tags.push('Manipulado');

      feed.push({
        id: `rec_${r.id}`,
        tipo: 'receita',
        titulo: r.tipo === 'receita_manipulada' ? 'Receita de Manipulado' : 'Receita Veterinária',
        subtitulo: r.status === 'importada' ? `${statusLabel}${r.tokenExterno ? ` · Token ${r.tokenExterno}` : ''}` : `Status: ${statusLabel} · Cód: ${r.codigoVerificacao}`,
        pacienteNome: r.pacienteNome || p?.nome || 'Paciente',
        pacienteEspecie: r.pacienteEspecie || p?.especie,
        pacienteId: r.pacienteId,
        tutorNome: r.tutorNome || tutor?.nomeCompleto || 'Tutor',
        tutorId: tutor?.id,
        dataHora: r.status === 'importada' ? r.criadoEm : (r.atualizadoEm || r.criadoEm),
        resumo: r.conteudoPrescricao || r.conteudoClinico || (isAssinada ? `Documento assinado digitalmente por ${r.assinatura?.titular || r.veterinarioNome}` : 'Receita emitida no sistema'),
        veterinario: r.veterinarioNome,
        tags,
        raw: r
      });
    });

    // Ordenar do mais recente para o mais antigo
    feed.sort((a, b) => (b.dataHora || '').localeCompare(a.dataHora || ''));
    return feed;
  }, [consultas, termos, medicamentos, exames, analises, receitas, pacienteMap, tutorMap]);

  // Lista única de anos disponíveis no histórico
  const anosDisponiveis = useMemo(() => {
    const anos = new Set<string>();
    todosEventos.forEach(item => {
      if (item.dataHora) {
        const ano = item.dataHora.slice(0, 4);
        if (ano && !isNaN(Number(ano))) anos.add(ano);
      }
    });
    return Array.from(anos).sort((a, b) => b.localeCompare(a));
  }, [todosEventos]);

  // Filtragem dos eventos
  const eventosFiltrados = useMemo(() => {
    return todosEventos.filter(item => {
      // Filtro de texto (Animal, Tutor, Veterinário, Conteúdo)
      if (busca.trim()) {
        const query = busca.toLowerCase();
        const matchAnimal = item.pacienteNome.toLowerCase().includes(query);
        const matchTutor = item.tutorNome.toLowerCase().includes(query);
        const matchTitulo = item.titulo.toLowerCase().includes(query);
        const matchResumo = item.resumo.toLowerCase().includes(query);
        const matchVet = (item.veterinario || '').toLowerCase().includes(query);

        if (!matchAnimal && !matchTutor && !matchTitulo && !matchResumo && !matchVet) {
          return false;
        }
      }

      // Filtro de Tipo
      if (filtroTipo === 'encaminhamento') {
        if (item.tipo !== 'exame' || !item.raw?.isEncaminhamento) return false;
      } else if (filtroTipo !== 'todos' && item.tipo !== filtroTipo) {
        return false;
      }

      // Filtro de Ano
      if (filtroAno !== 'todos') {
        const itemAno = item.dataHora.slice(0, 4);
        if (itemAno !== filtroAno) return false;
      }

      // Filtro de Mês
      if (filtroMes !== 'todos') {
        const itemMes = item.dataHora.slice(5, 7);
        if (itemMes !== filtroMes) return false;
      }

      return true;
    });
  }, [todosEventos, busca, filtroTipo, filtroAno, filtroMes]);

  // Agrupamento por Data (Dia)
  const eventosAgrupadosPorData = useMemo(() => {
    const groups: { [key: string]: FeedItem[] } = {};

    eventosFiltrados.forEach(item => {
      const dataKey = item.dataHora ? item.dataHora.slice(0, 10) : 'Sem Data';
      if (!groups[dataKey]) {
        groups[dataKey] = [];
      }
      groups[dataKey].push(item);
    });

    return Object.entries(groups).map(([dataStr, itens]) => {
      let labelData = dataStr;
      try {
        const [y, m, d] = dataStr.split('-');
        if (y && m && d) {
          const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
          const hoje = new Date();
          const hojeStr = hoje.toISOString().slice(0, 10);
          
          if (dataStr === hojeStr) {
            labelData = `Hoje · ${dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`;
          } else {
            labelData = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
            labelData = labelData.charAt(0).toUpperCase() + labelData.slice(1);
          }
        }
      } catch {
        labelData = dataStr;
      }

      return {
        dataKey: dataStr,
        labelData,
        itens
      };
    });
  }, [eventosFiltrados]);

  // Cores e Ícones por Tipo
  const getTipoVisual = (tipo: TipoHistoricoItem) => {
    switch (tipo) {
      case 'consulta':
        return {
          icon: Stethoscope,
          bg: 'bg-teal-100',
          text: 'text-teal-700',
          badge: 'bg-teal-50 text-teal-700 border-teal-200',
          label: 'Consulta'
        };
      case 'termo':
        return {
          icon: FileSignature,
          bg: 'bg-indigo-100',
          text: 'text-indigo-700',
          badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          label: 'Termo / Documento'
        };
      case 'receita':
        return {
          icon: Pill,
          bg: 'bg-emerald-100',
          text: 'text-emerald-700',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: 'Receita Digital'
        };
      case 'medicamento':
        return {
          icon: Syringe,
          bg: 'bg-amber-100',
          text: 'text-amber-700',
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          label: 'Medicamento'
        };
      case 'exame':
        return {
          icon: FileText,
          bg: 'bg-sky-100',
          text: 'text-sky-700',
          badge: 'bg-sky-50 text-sky-700 border-sky-200',
          label: 'Exame'
        };
      case 'analise':
        return {
          icon: Sparkles,
          bg: 'bg-violet-100',
          text: 'text-violet-700',
          badge: 'bg-violet-50 text-violet-700 border-violet-200',
          label: 'ClinicOS IA'
        };
      default:
        return {
          icon: Clock,
          bg: 'bg-slate-100',
          text: 'text-slate-700',
          badge: 'bg-slate-50 text-slate-700 border-slate-200',
          label: 'Registro'
        };
    }
  };

  const fmtHora = (iso: string) => {
    try {
      const d = new Date(iso);
      return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const exportarRelatorioReceitasCsv = () => {
    if (receitas.length === 0) {
      alert('Nenhuma receita encontrada para exportação.');
      return;
    }

    const headers = [
      'Data Emissao',
      'Token Dispensacao',
      'Codigo Autenticidade',
      'Subtipo',
      'Controlado',
      'Notificacao SIPEAGRO',
      'Status Assinatura',
      'Status Dispensacao',
      'Veterinario',
      'CRMV',
      'Registro MAPA',
      'Tutor',
      'CPF Tutor',
      'Animal',
      'Especie',
      'Medicamentos',
      'Quantidades Prescritas',
      'Quantidades Dispensadas',
      'Saldos Restantes',
      'Dispensacoes Registradas',
    ];

    const rows = receitas.map(r => {
      const p = pacienteMap.get(r.pacienteId);
      const tutor = p ? tutorMap.get(p.tutorId) : null;
      const itensStr = (r.itens || []).map(it => `${it.produto} ${it.concentracao || ''}`.trim()).join(' | ');
      const qtdsStr = (r.itens || []).map(it => `${it.quantidadePrescrita} ${it.unidade || ''}`.trim()).join(' | ');
      const dispQtdsStr = (r.itens || []).map(it => `${it.quantidadeDispensada || 0}`).join(' | ');
      const saldosStr = (r.itens || []).map(it => `${it.saldoRestante ?? it.quantidadePrescrita}`).join(' | ');
      const farmaciasStr = (r.dispensacoes || []).map(d => `${d.protocolo}: ${d.farmaciaNome} (${d.farmaceuticoCrf})`).join(' | ');

      return [
        r.criadoEm ? new Date(r.criadoEm).toLocaleDateString('pt-BR') : '',
        r.tokenDispensacao || '',
        r.codigoVerificacao || '',
        r.subtipo || (r.tipo === 'receita_manipulada' ? 'magistral' : 'simples'),
        r.isControlado ? 'SIM' : 'NAO',
        r.numeroNotificacaoSipeagro || '',
        r.status || 'rascunho',
        r.statusDispensacao || 'nao_dispensada',
        r.veterinarioNome || '',
        r.veterinarioCrmv || '',
        r.registroMapa || '',
        r.tutorNome || tutor?.nomeCompleto || '',
        r.tutorCpf || tutor?.cpf || '',
        r.pacienteNome || p?.nome || '',
        r.pacienteEspecie || p?.especie || '',
        `"${itensStr.replace(/"/g, '""')}"`,
        `"${qtdsStr.replace(/"/g, '""')}"`,
        `"${dispQtdsStr.replace(/"/g, '""')}"`,
        `"${saldosStr.replace(/"/g, '""')}"`,
        `"${farmaciasStr.replace(/"/g, '""')}"`,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Livro_Receitas_Controladas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-20 max-w-[1400px] mx-auto text-slate-700 animate-fade-in">
      
      {/* ── CABEÇALHO & MÉTRICAS RÁPIDAS ───────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0 shadow-sm">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Histórico Geral da Clínica</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Feed cronológico unificado agregando todas as consultas, receitas, termos e exames da clínica.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={exportarRelatorioReceitasCsv}
              className="px-3.5 py-2 bg-slate-100 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-900 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Exportar livro de receituário e controle especial em formato CSV"
            >
              <Download className="w-3.5 h-3.5 text-teal-600" />
              <span>Livro de Receitas (CSV)</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Eventos:</span>
              <span className="bg-teal-600 text-white font-black text-sm px-3 py-1 rounded-xl shadow-sm">
                {todosEventos.length}
              </span>
            </div>
          </div>
        </div>

        {/* ── FILTROS E BUSCA INTEGRADA ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-4 border-t border-slate-100">
          
          {/* Campo de Busca Livre */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por animal, tutor, veterinário ou fármaco..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none transition-all placeholder:text-slate-400"
            />
            {busca && (
              <button
                onClick={() => setBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro de Tipo de Registro */}
          <div>
            <select
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
            >
              <option value="todos">Todos os Tipos</option>
              <option value="consulta">Apenas Consultas</option>
              <option value="receita">Receitas Digitais (ICP-Brasil)</option>
              <option value="termo">Apenas Termos e Documentos</option>
              <option value="medicamento">Apenas Medicamentos</option>
              <option value="exame">Apenas Exames</option>
              <option value="encaminhamento">Exames de Encaminhamento</option>
              <option value="analise">Apenas ClinicOS IA</option>
            </select>
          </div>

          {/* Filtro de Ano */}
          <div>
            <select
              value={filtroAno}
              onChange={e => setFiltroAno(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
            >
              <option value="todos">Todos os Anos</option>
              {anosDisponiveis.map(ano => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
          </div>

          {/* Filtro de Mês */}
          <div>
            <select
              value={filtroMes}
              onChange={e => setFiltroMes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
            >
              <option value="todos">Todos os Meses</option>
              {MESES.map(m => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* ── FEED CRONOLÓGICO DA CLÍNICA ────────────────────────────────────────── */}
      {eventosAgrupadosPorData.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <Clock className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">Nenhum registro encontrado</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Não há registros correspondentes aos filtros selecionados. Tente ajustar os termos de busca ou filtros de ano/mês.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {eventosAgrupadosPorData.map(grupo => (
            <div key={grupo.dataKey} className="space-y-3">
              
              {/* Divisor de Data */}
              <div className="flex items-center gap-3">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold border border-slate-200 shadow-sm flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                  {grupo.labelData}
                </span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              {/* Itens do Dia */}
              <div className="grid grid-cols-1 gap-3">
                {grupo.itens.map(item => {
                  const visual = getTipoVisual(item.tipo);
                  const Icon = visual.icon;
                  const horaStr = fmtHora(item.dataHora);

                  return (
                    <div
                      key={item.id}
                      onClick={() => setItemDetalhe(item)}
                      className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm hover:border-teal-400 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                    >
                      {/* Lado Esquerdo: Ícone + Info do Paciente e Tutor */}
                      <div className="flex items-start gap-4 min-w-0">
                        <div className={`w-11 h-11 rounded-2xl ${visual.bg} ${visual.text} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
                          <Icon className="w-5 h-5" />
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${visual.badge}`}>
                              {visual.label}
                            </span>
                            <h3 className="text-sm font-bold text-slate-800 truncate">
                              {item.titulo}
                            </h3>
                            {item.subtitulo && (
                              <span className="text-xs text-slate-500 font-medium">
                                · {item.subtitulo}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                            <span className="flex items-center gap-1 font-semibold text-teal-800">
                              <PawPrint className="w-3.5 h-3.5 text-teal-600" />
                              {item.pacienteNome} {item.pacienteEspecie ? `(${item.pacienteEspecie})` : ''}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="flex items-center gap-1 text-slate-600">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              Tutor: <strong>{item.tutorNome}</strong>
                            </span>
                            {item.veterinario && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-500">Vet: {item.veterinario}</span>
                              </>
                            )}
                          </div>

                          <p className="text-xs text-slate-500 line-clamp-1 leading-relaxed pt-0.5">
                            {item.resumo}
                          </p>
                        </div>
                      </div>

                      {/* Lado Direito: Horário, Valor e Ação */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="text-left sm:text-right">
                          {horaStr && (
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {horaStr}
                            </span>
                          )}
                          {item.valor !== undefined && item.valor > 0 && (
                            <span className="text-xs font-bold text-emerald-700 block mt-0.5">
                              R$ {item.valor.toFixed(2)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-xs font-bold text-teal-600 group-hover:text-teal-700">
                          <span>Detalhes</span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ── MODAL DE DETALHES DO EVENTO CLÍNICO ─────────────────────────────────── */}
      {itemDetalhe && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-100 bg-teal-50/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-700">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">{itemDetalhe.titulo}</h2>
                  <p className="text-xs text-slate-500">
                    Paciente: <strong>{itemDetalhe.pacienteNome}</strong> · Tutor: {itemDetalhe.tutorNome}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setItemDetalhe(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo Modal */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-700">
              
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Data e Horário</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {new Date(itemDetalhe.dataHora).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Veterinário(a)</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {itemDetalhe.veterinario || 'Não especificado'}
                  </p>
                </div>
              </div>

              {itemDetalhe.tags && itemDetalhe.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {itemDetalhe.tags.map(t => (
                    <span key={t} className="px-2.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-full font-bold text-[10px]">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Conteúdo / Descrição Detalhada
                </span>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed max-h-60 overflow-y-auto">
                  {itemDetalhe.resumo}
                </div>
              </div>

              {itemDetalhe.valor !== undefined && itemDetalhe.valor > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                  <span className="font-bold text-emerald-800">Valor do Procedimento / Consulta</span>
                  <span className="font-black text-sm text-emerald-900">R$ {itemDetalhe.valor.toFixed(2)}</span>
                </div>
              )}

              {itemDetalhe.tipo === 'receita' && itemDetalhe.raw?.status === 'importada' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-[12px] text-slate-700">
                  <p><strong>Emitida fora do ClinicOS</strong>{itemDetalhe.raw.origemExterna ? ` (${itemDetalhe.raw.origemExterna})` : ''} e importada para o histórico.</p>
                  {itemDetalhe.raw.tokenExterno && <p>Token de dispensação no sistema de origem: <span className="font-mono font-bold">{itemDetalhe.raw.tokenExterno}</span></p>}
                  {itemDetalhe.raw.assinadaExternamente && <p>O PDF original foi assinado com certificado ICP-Brasil no sistema de origem.</p>}
                </div>
              )}

              {itemDetalhe.tipo === 'receita' && itemDetalhe.raw && itemDetalhe.raw.status !== 'importada' && (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-teal-900">Código de Verificação Pública:</span>
                    <span className="font-mono font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                      {itemDetalhe.raw.codigoVerificacao}
                    </span>
                  </div>
                  {itemDetalhe.raw.assinatura && (
                    <p className="text-[11px] text-teal-800">
                      Assinado digitalmente por <strong>{itemDetalhe.raw.assinatura.titular}</strong> (CPF {itemDetalhe.raw.assinatura.cpfMascarado}) via {itemDetalhe.raw.assinatura.emissorAC}
                    </p>
                  )}
                </div>
              )}

            </div>

            {/* Footer Modal */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                {itemDetalhe.tipo === 'receita' && itemDetalhe.raw?.signedPdfUrl && (
                  <a
                    href={itemDetalhe.raw.signedPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Baixar PDF Assinado
                  </a>
                )}
                {itemDetalhe.tipo === 'receita' && itemDetalhe.raw?.pdfImportadoUrl && (
                  <a
                    href={itemDetalhe.raw.pdfImportadoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Abrir PDF original
                  </a>
                )}
                {itemDetalhe.tipo === 'receita' && itemDetalhe.raw?.codigoVerificacao && itemDetalhe.raw?.status !== 'importada' && (
                  <a
                    href={`/verificar/${itemDetalhe.raw.codigoVerificacao}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Página Pública
                  </a>
                )}
              </div>
              <button
                onClick={() => setItemDetalhe(null)}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
