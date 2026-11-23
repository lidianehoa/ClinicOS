import React, { useState, useEffect } from 'react';
import { FileText, Stethoscope, FileSearch, Sparkles, TrendingUp, Building2 } from 'lucide-react';
import { 
  subscribeMedicalRecords, type MedicalRecord,
  subscribeExames, type Exame,
  subscribeAnalises, type AnaliseClinica,
  subscribeNotas, type NotaExplicativa,
  subscribeTermosAtendimento, type TermoAtendimento,
  subscribeEvolucoesPaciente, type EvolucaoCaso,
  addCasoClinico,
  getActiveTenantId
} from '../services/dataService';
import UploadExameModal from './UploadExameModal';
import ReviewAnaliseModal from './ReviewAnaliseModal';
import { IA_ATIVA } from '../config/recursos';

interface PatientTimelineProps {
  clientId: string;
  onViewRecord: (record: MedicalRecord) => void;
}

type TimelineItem = 
  | { type: 'record', date: string, data: MedicalRecord }
  | { type: 'exame', date: string, data: Exame }
  | { type: 'analise', date: string, data: AnaliseClinica }
  | { type: 'nota', date: string, data: NotaExplicativa }
  | { type: 'termo', date: string, data: TermoAtendimento }
  | { type: 'evolucao', date: string, data: EvolucaoCaso };

const PatientTimeline: React.FC<PatientTimelineProps> = ({ clientId, onViewRecord }) => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [exames, setExames] = useState<Exame[]>([]);
  const [analises, setAnalises] = useState<AnaliseClinica[]>([]);
  const [notas, setNotas] = useState<NotaExplicativa[]>([]);
  const [termos, setTermos] = useState<TermoAtendimento[]>([]);
  const [evolucoes, setEvolucoes] = useState<EvolucaoCaso[]>([]);
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedExameForReview, setSelectedExameForReview] = useState<Exame | null>(null);

  useEffect(() => {
    if (!clientId) return;
    const unsubRecords = subscribeMedicalRecords(clientId, setRecords);
    const unsubExames = subscribeExames(clientId, setExames);
    const unsubAnalises = subscribeAnalises(clientId, setAnalises);
    const unsubNotas = subscribeNotas(clientId, setNotas);
    const unsubTermos = subscribeTermosAtendimento(clientId, setTermos);
    const unsubEvolucoes = subscribeEvolucoesPaciente(clientId, setEvolucoes);

    return () => {
      unsubRecords();
      unsubExames();
      unsubAnalises();
      unsubNotas();
      unsubTermos();
      unsubEvolucoes();
    };
  }, [clientId]);

  const timelineItems: TimelineItem[] = [
    ...records.map(r => ({ type: 'record' as const, date: `${r.date}T${r.time}:00Z`, data: r })),
    ...exames.map(e => ({ type: 'exame' as const, date: e.dataUpload, data: e })),
    ...analises.map(a => ({ type: 'analise' as const, date: a.dataAnalise, data: a })),
    ...notas.map(n => ({ type: 'nota' as const, date: n.geradaEm, data: n })),
    ...termos.map(t => ({ type: 'termo' as const, date: t.geradoEm, data: t })),
    ...evolucoes.map(ev => ({ type: 'evolucao' as const, date: ev.criadoEm || `${ev.data}T00:00:00Z`, data: ev })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getAnalise = (analiseId: string) => analises.find(a => a.id === analiseId);
  const getNota = (analiseId: string) => notas.find(n => n.analiseId === analiseId);

  const handleCreateCaso = async () => {
    // Guard: clientId deve ser um ID real (não vazio) para evitar caso órfão
    if (!clientId || clientId.trim() === '') {
      alert('Nenhum paciente selecionado. Abra o prontuário de um paciente para criar um caso.');
      return;
    }
    try {
      // Cria um novo caso clínico para o paciente (clientId)
      const novoCasoId = await addCasoClinico({
        pacienteId: clientId,
        sintomasPrincipais: '',
        historicoClinico: '',
        examesIds: [],
        status: 'pendente',
        tenantId: getActiveTenantId()   // corrigido: era '' (string vazia)
      });
      // Redireciona para a tela de detalhe do novo caso
      window.location.href = `/?tab=caso-clinico&id=${novoCasoId}`;
    } catch (error) {
      console.error('Erro ao criar caso clínico:', error);
      alert('Erro ao criar caso clínico. Tente novamente.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-700">Histórico de Prontuários e Exames</h3>
        {IA_ATIVA && <button 
          onClick={handleCreateCaso}
          disabled={!clientId}
          className={`flex items-center gap-2 px-4 py-2 font-bold text-sm rounded-xl transition-colors ${!clientId ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-teal-50 text-teal-600 hover:bg-teal-100'}`}
        >
          <Sparkles className="w-4 h-4" />
          Novo Caso Clínico (IA)
        </button>}
      </div>

      <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
        {timelineItems.length === 0 && (
          <p className="text-center text-slate-400 py-8 text-sm">Nenhum evento registrado na linha do tempo.</p>
        )}
        
        {timelineItems.map((item) => {
          if (item.type === 'record') {
            const rec = item.data;
            return (
              <div key={rec.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  <Stethoscope className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-bold text-slate-800">Prontuário - {rec.diagnosis || 'Sem diagnóstico'}</p>
                    <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-full">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{rec.chiefComplaint}</p>
                  <div className="mt-3 flex justify-between items-center">
                     <p className="text-[10px] text-slate-400">Dr(a) {rec.professionalName}</p>
                     <button onClick={() => onViewRecord(rec)} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 font-bold text-[10px] rounded-lg hover:bg-indigo-100">Ver Prontuário</button>
                  </div>
                </div>
              </div>
            );
          }

          if (item.type === 'exame') {
            const exame = item.data;
            const isAnalyzed = true; // TODO: migrate to caso status
            const isEnc = !!exame.isEncaminhamento;
            return (
              <div key={exame.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  <FileSearch className="w-5 h-5 text-pink-500" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-2xl border border-pink-100 shadow-sm flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-bold text-slate-800">Exame: {exame.tipo}</p>
                      {isEnc && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200 mt-1">
                          <Building2 className="w-3 h-3 text-amber-600" />
                          Encaminhamento: {exame.encaminhamento?.clinicaOrigem || 'Externa'}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-full">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">Status: <span className={`font-semibold ${isAnalyzed ? 'text-emerald-600' : 'text-amber-500'}`}>{isAnalyzed ? 'Analisado' : 'Processando...'}</span></p>
                  {isEnc && exame.encaminhamento && (
                    <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200/70 text-xs text-slate-700 mb-2 space-y-0.5">
                      <p className="font-semibold text-amber-900">Origem: {exame.encaminhamento.clinicaOrigem} {exame.encaminhamento.crmvOrigem ? `(CRMV: ${exame.encaminhamento.crmvOrigem})` : ''}</p>
                      {exame.encaminhamento.motivoEncaminhamento && (
                        <p className="text-slate-600">Motivo: {exame.encaminhamento.motivoEncaminhamento}</p>
                      )}
                    </div>
                  )}
                  <div className="mt-2 flex gap-2">
                    <a href={exame.fileUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-slate-50 text-slate-600 font-bold text-[10px] rounded-lg hover:bg-slate-100 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Ver Exame
                    </a>
                    {IA_ATIVA && isAnalyzed && (
                       <button onClick={() => setSelectedExameForReview(exame)} className="px-3 py-1.5 bg-pink-50 text-pink-600 font-bold text-[10px] rounded-lg hover:bg-pink-100 flex items-center gap-1 cursor-pointer">
                         <Sparkles className="w-3 h-3" /> Revisar Análise
                       </button>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          if (item.type === 'nota') {
            const nota = item.data;
            return (
              <div key={nota.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  <FileText className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 shadow-sm flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-1">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      Nota Explicativa
                    </p>
                    <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-full">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="text-xs text-slate-700 whitespace-pre-wrap max-h-32 overflow-y-auto mt-2 bg-white p-3 rounded-xl border border-emerald-50">
                    {nota.conteudo}
                  </div>
                </div>
              </div>
            );
          }
          if (item.type === 'termo') {
            const termo = item.data;
            const isSigned = termo.status === 'assinado';
            const isRefused = termo.status === 'recusado_com_testemunhas';
            
            return (
              <div key={termo.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                </div>
                <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border shadow-sm flex flex-col ${isSigned ? 'bg-indigo-50/50 border-indigo-100' : isRefused ? 'bg-red-50/50 border-red-100' : 'bg-white border-slate-200'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-1">
                      Termo: {termo.tipo.toUpperCase().replace(/_/g, ' ')}
                    </p>
                    <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-full">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">
                    Status: <span className={`font-semibold ${isSigned ? 'text-indigo-600' : isRefused ? 'text-red-600' : 'text-amber-500'}`}>
                      {isSigned ? 'Assinado' : isRefused ? 'Recusado' : 'Pendente'}
                    </span>
                  </p>
                  {termo.pdfUrl && (
                    <div className="mt-2 flex gap-2">
                      <a href={termo.pdfUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-slate-50 text-slate-600 font-bold text-[10px] rounded-lg hover:bg-slate-100 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Ver PDF
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          if (item.type === 'evolucao') {
            const ev = item.data;
            return (
              <div key={ev.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-amber-50 text-amber-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  <TrendingUp className="w-5 h-5 text-amber-500" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-amber-50/40 p-4 rounded-2xl border border-amber-200/60 shadow-sm flex flex-col">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-amber-600" />
                      Evolução do Caso
                    </p>
                    <span className="text-[10px] text-slate-500 font-medium bg-amber-100/80 px-2.5 py-0.5 rounded-full">
                      {new Date(ev.data).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap mt-2 line-clamp-4 bg-white p-3 rounded-xl border border-amber-100">
                    {ev.texto}
                  </p>
                  {ev.condutaAjustada && (
                    <div className="mt-2 text-xs text-teal-800 bg-teal-50 p-2.5 rounded-xl border border-teal-100">
                      <span className="font-bold">Conduta Ajustada: </span>{ev.condutaAjustada}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 mt-2 font-medium">Por: {ev.registradoPor}</p>
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>

      {isUploadModalOpen && (
        <UploadExameModal 
           clientId={clientId} 
           onClose={() => setIsUploadModalOpen(false)} 
        />
      )}

      {selectedExameForReview && (
        <ReviewAnaliseModal
          exame={selectedExameForReview}
          analise={getAnalise("") /* TODO */}
          notaGerada={getNota("") /* TODO */}
          onClose={() => setSelectedExameForReview(null)}
        />
      )}

    </div>
  );
};

export default PatientTimeline;
