import { useState, useEffect } from 'react';
import { 
  TrendingUp, Plus, Calendar, FileText, User, X, Save, 
  ExternalLink, Sparkles, Upload, CheckSquare, Square, Stethoscope, AlertTriangle,
  Trash2, ClipboardList, Pill
} from 'lucide-react';
import { 
  EvolucaoCaso, 
  Exame, 
  AppUser, 
  ConsultaAtendimento, 
  Paciente,
  PlanoDiagnosticoItem,
  CondutaTratamentoItem
} from '../services/dataService';
import UploadExameModal from './UploadExameModal';

interface EvolucaoCasoModuleProps {
  patientId: string;
  patientName?: string;
  pacientes?: Paciente[];
  consultasHist?: ConsultaAtendimento[];
  tutorId?: string;
  examesHist: Exame[];
  evolucoes: EvolucaoCaso[];
  userProfile?: AppUser | null;
  onSaveEvolucao: (evolucao: Partial<EvolucaoCaso>) => Promise<void>;
}

export default function EvolucaoCasoModule({
  patientId,
  patientName,
  pacientes = [],
  consultasHist = [],
  tutorId,
  examesHist,
  evolucoes,
  userProfile,
  onSaveEvolucao
}: EvolucaoCasoModuleProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Form State
  const [selectedPatientId, setSelectedPatientId] = useState(patientId || '');
  const [consultaReferenciaId, setConsultaReferenciaId] = useState('');
  const [dataEvolucao, setDataEvolucao] = useState(new Date().toISOString().slice(0, 10));
  const [textoEvolucao, setTextoEvolucao] = useState('');
  const [condutaAjustada, setCondutaAjustada] = useState('');
  
  // Tabelas Estruturadas
  const [planoDiagnostico, setPlanoDiagnostico] = useState<PlanoDiagnosticoItem[]>([]);
  const [tratamentosInstituidos, setTratamentosInstituidos] = useState<CondutaTratamentoItem[]>([]);

  const [selectedExames, setSelectedExames] = useState<string[]>([]);
  const [registradoPor, setRegistradoPor] = useState(userProfile?.nome || 'Médico(a) Veterinário(a)');
  const [saving, setSaving] = useState(false);

  // Consultas disponíveis para o paciente selecionado
  const availableConsultas = [...consultasHist].sort((a, b) => 
    (b.data || b.criadoEm).localeCompare(a.data || a.criadoEm)
  );

  useEffect(() => {
    if (patientId) {
      setSelectedPatientId(patientId);
    }
  }, [patientId]);

  const toggleExameSelect = (exameId: string) => {
    setSelectedExames(prev => 
      prev.includes(exameId) 
        ? prev.filter(id => id !== exameId) 
        : [...prev, exameId]
    );
  };

  const handleOpenNewModal = () => {
    setSelectedPatientId(patientId || (pacientes[0]?.id || ''));
    setConsultaReferenciaId(availableConsultas[0]?.id || '');
    setDataEvolucao(new Date().toISOString().slice(0, 10));
    setTextoEvolucao('');
    setCondutaAjustada('');
    setPlanoDiagnostico([]);
    setTratamentosInstituidos([]);
    setSelectedExames([]);
    setRegistradoPor(userProfile?.nome || 'Médico(a) Veterinário(a)');
    setIsModalOpen(true);
  };

  // Funções para manipular a tabela Plano Diagnóstico
  const handleAddPlanoDiagnostico = () => {
    setPlanoDiagnostico(prev => [
      ...prev,
      { id: `diag_${Date.now()}_${Math.random()}`, exameProcedimento: '', justificativa: '' }
    ]);
  };

  const handleUpdatePlanoDiagnostico = (index: number, field: keyof PlanoDiagnosticoItem, value: string) => {
    setPlanoDiagnostico(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemovePlanoDiagnostico = (index: number) => {
    setPlanoDiagnostico(prev => prev.filter((_, i) => i !== index));
  };

  // Funções para manipular a tabela Conduta / Tratamento Instituído
  const handleAddTratamento = () => {
    setTratamentosInstituidos(prev => [
      ...prev,
      { id: `trat_${Date.now()}_${Math.random()}`, medicacaoProcedimento: '', doseViaFreq: '', duracao: '' }
    ]);
  };

  const handleUpdateTratamento = (index: number, field: keyof CondutaTratamentoItem, value: string) => {
    setTratamentosInstituidos(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveTratamento = (index: number) => {
    setTratamentosInstituidos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalPatientId = patientId || selectedPatientId;
    if (!finalPatientId) {
      alert('Por favor, selecione um paciente.');
      return;
    }

    if (!consultaReferenciaId) {
      alert('Por favor, selecione a Consulta/Atendimento de Referência a qual esta evolução se refere.');
      return;
    }

    if (!textoEvolucao.trim()) {
      alert('Por favor, descreva o texto da evolução do paciente.');
      return;
    }

    // Filtrar linhas vazias das tabelas estruturadas
    const cleanPlano = planoDiagnostico.filter(p => p.exameProcedimento.trim() || p.justificativa.trim());
    const cleanTrat = tratamentosInstituidos.filter(t => t.medicacaoProcedimento.trim() || t.doseViaFreq.trim() || t.duracao.trim());

    setSaving(true);
    try {
      await onSaveEvolucao({
        pacienteId: finalPatientId,
        consultaReferenciaId: consultaReferenciaId,
        tutorId: tutorId || '',
        data: dataEvolucao,
        texto: textoEvolucao.trim(),
        examesReferenciados: selectedExames,
        planoDiagnostico: cleanPlano,
        tratamentosInstituidos: cleanTrat,
        condutaAjustada: condutaAjustada.trim() || undefined,
        registradoPor: registradoPor.trim() || 'Médico(a) Veterinário(a)',
        criadoEm: new Date().toISOString()
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar evolução:', err);
      alert('Erro ao salvar o registro de evolução.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              Evolução do Caso & Reavaliações
            </h3>
            <p className="text-xs text-slate-500">
              Acompanhamento cronológico vinculado a consultas registradas do paciente.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenNewModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-2xl shadow-md shadow-amber-500/20 transition-all self-start md:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nova Evolução
        </button>
      </div>

      {/* Lista de Evoluções */}
      {evolucoes.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-amber-50/30 border border-dashed border-amber-200 space-y-2">
          <TrendingUp className="w-10 h-10 text-amber-400 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700">Nenhuma evolução registrada para este caso</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Clique em <strong>"+ Nova Evolução"</strong> para registrar o acompanhamento do paciente, com Plano Diagnóstico e Conduta estruturados.
          </p>
        </div>
      ) : (
        <div className="space-y-4 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-amber-200/60">
          {evolucoes.map((ev, idx) => {
            const dateFormatted = new Date(ev.data).toLocaleDateString('pt-BR');
            const linkedExams = examesHist.filter(ex => ev.examesReferenciados?.includes(ex.id));
            const refConsulta = availableConsultas.find(c => c.id === ev.consultaReferenciaId);
            const refDateStr = refConsulta ? (refConsulta.data || refConsulta.criadoEm.slice(0, 10)) : null;
            const refDateFormatted = refDateStr ? new Date(refDateStr).toLocaleDateString('pt-BR') : null;

            return (
              <div key={ev.id || idx} className="relative pl-10 group">
                {/* Timeline Icon */}
                <div className="absolute left-1.5 top-1.5 w-6 h-6 rounded-full bg-amber-500 text-white border-2 border-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                  {evolucoes.length - idx}
                </div>

                <div className="bg-white rounded-2xl border border-amber-200/80 p-5 shadow-sm hover:shadow-md transition-all space-y-4">
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-amber-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        Evolução de {dateFormatted}
                      </span>

                      {refDateFormatted ? (
                        <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                          Ref: Consulta de {refDateFormatted}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          Atendimento Geral
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {ev.registradoPor}
                    </span>
                  </div>

                  {/* Texto da Evolução */}
                  <div>
                    <h5 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1">
                      Evolução & Sinais Clínicos
                    </h5>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                      {ev.texto}
                    </p>
                  </div>

                  {/* Tabela Estruturada: Plano Diagnóstico */}
                  {ev.planoDiagnostico && ev.planoDiagnostico.length > 0 && (
                    <div className="bg-indigo-50/50 border border-indigo-200/80 rounded-xl p-3.5 space-y-2">
                      <h5 className="text-xs font-bold uppercase text-indigo-900 tracking-wider flex items-center gap-1.5">
                        <ClipboardList className="w-3.5 h-3.5 text-indigo-600" />
                        Plano Diagnóstico
                      </h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-indigo-200/60 text-indigo-900 font-bold">
                              <th className="py-1.5 px-2">Exame / Procedimento</th>
                              <th className="py-1.5 px-2">Justificativa Clínica</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-indigo-100">
                            {ev.planoDiagnostico.map((item, i) => (
                              <tr key={i} className="hover:bg-indigo-50/40">
                                <td className="py-1.5 px-2 font-semibold text-slate-800">{item.exameProcedimento || '—'}</td>
                                <td className="py-1.5 px-2 text-slate-600">{item.justificativa || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Tabela Estruturada: Conduta / Tratamento Instituído */}
                  {ev.tratamentosInstituidos && ev.tratamentosInstituidos.length > 0 && (
                    <div className="bg-teal-50/60 border border-teal-200/80 rounded-xl p-3.5 space-y-2">
                      <h5 className="text-xs font-bold uppercase text-teal-900 tracking-wider flex items-center gap-1.5">
                        <Pill className="w-3.5 h-3.5 text-teal-600" />
                        Conduta / Tratamento Instituído
                      </h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-teal-200/60 text-teal-900 font-bold">
                              <th className="py-1.5 px-2">Medicação / Procedimento</th>
                              <th className="py-1.5 px-2">Dose / Via / Frequência</th>
                              <th className="py-1.5 px-2">Duração</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-teal-100">
                            {ev.tratamentosInstituidos.map((item, i) => (
                              <tr key={i} className="hover:bg-teal-50/40">
                                <td className="py-1.5 px-2 font-semibold text-teal-950">{item.medicacaoProcedimento || '—'}</td>
                                <td className="py-1.5 px-2 text-slate-700">{item.doseViaFreq || '—'}</td>
                                <td className="py-1.5 px-2 text-slate-600">{item.duracao || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Conduta Ajustada em Texto Livre (se houver) */}
                  {ev.condutaAjustada && (
                    <div className="bg-amber-50/60 border border-amber-200 p-3.5 rounded-xl">
                      <h5 className="text-xs font-bold uppercase text-amber-900 tracking-wider mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        Observações de Conduta / Plano Geral
                      </h5>
                      <p className="text-xs text-amber-950 font-medium whitespace-pre-wrap">
                        {ev.condutaAjustada}
                      </p>
                    </div>
                  )}

                  {/* Exames Referenciados */}
                  {linkedExams.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                        Exames Referenciados nesta Reavaliação ({linkedExams.length})
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {linkedExams.map(ex => (
                          <a
                            key={ex.id}
                            href={ex.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-600" />
                            {ex.tipo} ({new Date(ex.dataUpload).toLocaleDateString('pt-BR')})
                            <ExternalLink className="w-3 h-3 text-amber-500" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Nova Evolução */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E1B4B] border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Registrar Evolução do Caso</h3>
                  <p className="text-xs text-amber-200/70">Acompanhamento vinculado a uma consulta específica</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-white/50 hover:bg-white/10 hover:text-white rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Campo 1: Paciente */}
              <div>
                <label className="block text-xs font-semibold uppercase text-white/80 tracking-wider mb-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  Paciente *
                </label>
                {patientId ? (
                  <div className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white font-bold text-sm flex items-center justify-between">
                    <span>{patientName || 'Paciente Selecionado'}</span>
                    <span className="text-[10px] uppercase font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                      Contexto Ativo (Ficha do Paciente)
                    </span>
                  </div>
                ) : (
                  <select
                    value={selectedPatientId}
                    onChange={(e) => {
                      setSelectedPatientId(e.target.value);
                      setConsultaReferenciaId('');
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-400 cursor-pointer"
                    required
                  >
                    <option value="" disabled className="bg-slate-900 text-white">Selecione o paciente...</option>
                    {pacientes.map(p => (
                      <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                        {p.nome} ({p.especie} - {p.raca})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Campo 2: Consulta de Referência (Obrigatório) */}
              <div>
                <label className="block text-xs font-semibold uppercase text-white/80 tracking-wider mb-2 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-amber-400" />
                  Consulta / Atendimento de Referência *
                </label>
                {availableConsultas.length === 0 ? (
                  <div className="p-3.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-200 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Nenhuma consulta registrada para este paciente. É necessário registrar ao menos uma Consulta/Atendimento antes de lançar evoluções.</span>
                  </div>
                ) : (
                  <select
                    required
                    value={consultaReferenciaId}
                    onChange={e => setConsultaReferenciaId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-400 cursor-pointer font-medium"
                  >
                    <option value="" disabled className="bg-slate-900 text-white">Selecione o atendimento de referência...</option>
                    {availableConsultas.map(c => {
                      const dateStr = c.data || c.criadoEm.slice(0, 10);
                      const dateObj = new Date(dateStr);
                      const formatted = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('pt-BR') : dateStr;
                      const summary = c.sintomasPrincipais ? ` — Motivo: ${c.sintomasPrincipais.slice(0, 35)}...` : '';
                      return (
                        <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                          Consulta de {formatted}{summary}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Data & Veterinário */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-white/80 tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    Data da Reavaliação *
                  </label>
                  <input
                    type="date"
                    required
                    value={dataEvolucao}
                    onChange={e => setDataEvolucao(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-white/80 tracking-wider mb-2 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    Registrado Por *
                  </label>
                  <input
                    type="text"
                    required
                    value={registradoPor}
                    onChange={e => setRegistradoPor(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Texto Livre da Evolução */}
              <div>
                <label className="block text-xs font-semibold uppercase text-white/80 tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  Evolução do Paciente (O que mudou desde a última vez) *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Descreva a resposta ao tratamento, melhora/piora de sintomas, exames físicos atualizados ou novos achados..."
                  value={textoEvolucao}
                  onChange={e => setTextoEvolucao(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Tabela Estruturada 1: Plano Diagnóstico */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase text-indigo-300 tracking-wider flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-indigo-400" />
                    Plano Diagnóstico (Exames & Procedimentos)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddPlanoDiagnostico}
                    className="text-xs font-bold text-indigo-300 hover:text-indigo-200 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Adicionar Exame
                  </button>
                </div>

                {planoDiagnostico.length === 0 ? (
                  <p className="text-xs text-white/40 italic p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                    Nenhum exame adicionado ao plano desta reavaliação. Clique acima para incluir.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {planoDiagnostico.map((item, idx) => (
                      <div key={item.id || idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-white/5 p-2.5 rounded-xl border border-white/10">
                        <div className="md:col-span-5">
                          <input
                            type="text"
                            placeholder="Ex: Hemograma + Bioquímico"
                            value={item.exameProcedimento}
                            onChange={(e) => handleUpdatePlanoDiagnostico(idx, 'exameProcedimento', e.target.value)}
                            className="w-full bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2 text-white text-xs placeholder-white/30 focus:outline-none focus:border-indigo-400"
                          />
                        </div>
                        <div className="md:col-span-6">
                          <input
                            type="text"
                            placeholder="Justificativa clínica (ex: Monitorar anemia)"
                            value={item.justificativa}
                            onChange={(e) => handleUpdatePlanoDiagnostico(idx, 'justificativa', e.target.value)}
                            className="w-full bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2 text-white text-xs placeholder-white/30 focus:outline-none focus:border-indigo-400"
                          />
                        </div>
                        <div className="md:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemovePlanoDiagnostico(idx)}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                            title="Remover linha"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tabela Estruturada 2: Conduta / Tratamento Instituído */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase text-teal-300 tracking-wider flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-teal-400" />
                    Conduta & Tratamento Instituído
                  </label>
                  <button
                    type="button"
                    onClick={handleAddTratamento}
                    className="text-xs font-bold text-teal-300 hover:text-teal-200 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/30 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Adicionar Medicação / Conduta
                  </button>
                </div>

                {tratamentosInstituidos.length === 0 ? (
                  <p className="text-xs text-white/40 italic p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                    Nenhum tratamento estruturado nesta evolução. Clique acima para incluir medicamentos e doses.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {tratamentosInstituidos.map((item, idx) => (
                      <div key={item.id || idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-white/5 p-2.5 rounded-xl border border-white/10">
                        <div className="md:col-span-4">
                          <input
                            type="text"
                            placeholder="Medicação / Procedimento (ex: Amoxicilina + Clav)"
                            value={item.medicacaoProcedimento}
                            onChange={(e) => handleUpdateTratamento(idx, 'medicacaoProcedimento', e.target.value)}
                            className="w-full bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2 text-white text-xs placeholder-white/30 focus:outline-none focus:border-teal-400"
                          />
                        </div>
                        <div className="md:col-span-4">
                          <input
                            type="text"
                            placeholder="Dose / Via / Frequência (ex: 20mg/kg VO BID)"
                            value={item.doseViaFreq}
                            onChange={(e) => handleUpdateTratamento(idx, 'doseViaFreq', e.target.value)}
                            className="w-full bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2 text-white text-xs placeholder-white/30 focus:outline-none focus:border-teal-400"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <input
                            type="text"
                            placeholder="Duração (ex: 10 dias)"
                            value={item.duracao}
                            onChange={(e) => handleUpdateTratamento(idx, 'duracao', e.target.value)}
                            className="w-full bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2 text-white text-xs placeholder-white/30 focus:outline-none focus:border-teal-400"
                          />
                        </div>
                        <div className="md:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveTratamento(idx)}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                            title="Remover linha"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Conduta Ajustada em Texto Livre */}
              <div>
                <label className="block text-xs font-semibold uppercase text-white/80 tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Observações de Conduta / Orientações Gerais (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Orientações adicionais ao tutor, restrições alimentares, retorno previsto..."
                  value={condutaAjustada}
                  onChange={e => setCondutaAjustada(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Exames Referenciados */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase text-white/80 tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    Vincular Exames no Prontuário
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 font-bold cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    + Anexar Novo Exame
                  </button>
                </div>

                {examesHist.length === 0 ? (
                  <p className="text-xs text-white/40 italic p-3 bg-white/5 rounded-xl border border-white/5">
                    Nenhum exame cadastrado no prontuário ainda. Você pode clicar acima para anexar um novo exame.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto bg-white/5 p-3 rounded-xl border border-white/10">
                    {examesHist.map(ex => {
                      const isSelected = selectedExames.includes(ex.id);
                      return (
                        <div
                          key={ex.id}
                          onClick={() => toggleExameSelect(ex.id)}
                          className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-amber-500/20 border border-amber-500/40 text-white' : 'hover:bg-white/5 text-white/70'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-white/40 shrink-0" />
                            )}
                            <span className="text-xs font-medium">{ex.tipo}</span>
                          </div>
                          <span className="text-[10px] text-white/40">
                            {new Date(ex.dataUpload).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || availableConsultas.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Salvando...' : 'Salvar Evolução'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Inline para Anexar Exame */}
      {isUploadModalOpen && (
        <UploadExameModal
          clientId={patientId}
          onClose={() => setIsUploadModalOpen(false)}
        />
      )}
    </div>
  );
}
