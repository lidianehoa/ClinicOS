import React, { useState } from 'react';
import { X, Sparkles, AlertTriangle, FileText, Loader2, Save } from 'lucide-react';
import { Exame, AnaliseClinica, NotaExplicativa, APP_ID } from '../services/dataService';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface ReviewAnaliseModalProps {
  exame: Exame;
  analise?: AnaliseClinica;
  notaGerada?: NotaExplicativa;
  onClose: () => void;
}

const ReviewAnaliseModal: React.FC<ReviewAnaliseModalProps> = ({ exame, analise, notaGerada, onClose }) => {
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editedNota, setEditedNota] = useState(notaGerada?.conteudo || '');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const handleGenerateNote = async () => {
    if (!analise) return;
    setIsGeneratingNote(true);
    try {
      const functions = getFunctions();
      const generateNote = httpsCallable(functions, 'generateNote');
      await generateNote({
        analiseId: analise.id,
        pacienteId: exame.pacienteId,
        tenantId: APP_ID
      });
      // A nota será atualizada via listener do firestore no PatientTimeline
      setIsGeneratingNote(false);
    } catch (e) {
      console.error(e);
      setIsGeneratingNote(false);
    }
  };

  const handleSaveNote = async () => {
    if (!notaGerada) return;
    setIsSavingNote(true);
    try {
      const notaRef = doc(db!, 'artifacts', APP_ID, 'public', 'data', 'notas', notaGerada.id);
      await updateDoc(notaRef, {
        conteudo: editedNota,
        status: 'confirmada',
        confirmadaEm: new Date().toISOString()
      });
      setIsEditingNote(false);
      setIsSavingNote(false);
    } catch (e) {
      console.error(e);
      setIsSavingNote(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-500" />
              Revisão da Análise de Exame
            </h2>
            <p className="text-sm text-slate-500">Exame: {exame.tipo}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <strong>Atenção:</strong> Apoio à decisão clínica — NÃO constitui diagnóstico. O diagnóstico é ato exclusivo e de responsabilidade do médico-veterinário, que deve validar esta análise.
            </div>
          </div>

          {!analise ? (
             <div className="text-center py-8 text-slate-500 flex flex-col items-center">
               <Loader2 className="w-8 h-8 animate-spin text-pink-500 mb-2" />
               <p>A análise ainda está sendo processada...</p>
             </div>
          ) : (
            <>
              <div>
                <h3 className="font-bold text-slate-800 mb-3 text-lg">Resultado da IA</h3>
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed shadow-inner">
                  <div className="mb-4">
                    <h4 className="font-bold text-slate-800 text-sm mb-1">Achados Principais</h4>
                    <ul className="list-disc pl-5">
                      {analise.interpretacaoClinica}
                    </ul>
                  </div>
                  <div className="mb-4">
                    <h4 className="font-bold text-slate-800 text-sm mb-1">Diagnósticos Diferenciais</h4>
                    <ul className="list-disc pl-5">
                      {/* analise.diferenciais is an array of objects */}{analise.diferenciais?.map((d: any, i: number) => <li key={i}>{d.diagnostico}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">Conduta Sugerida</h4>
                    <p>{analise.condutaSugerida}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                 <h3 className="font-bold text-slate-800 mb-3 text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-500" />
                    Nota Explicativa (Para o Tutor)
                 </h3>
                 
                 {!notaGerada ? (
                    <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-100 text-center">
                       <p className="text-sm text-emerald-800 mb-4">Gere uma nota simplificada e didática para explicar este resultado ao tutor do paciente.</p>
                       <button 
                         onClick={handleGenerateNote}
                         disabled={isGeneratingNote}
                         className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                       >
                         {isGeneratingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                         {isGeneratingNote ? 'Gerando Nota...' : 'Gerar Nota Explicativa'}
                       </button>
                    </div>
                 ) : (
                    <div className="space-y-3">
                       {isEditingNote ? (
                         <div className="space-y-3">
                           <textarea 
                             value={editedNota}
                             onChange={e => setEditedNota(e.target.value)}
                             className="w-full h-48 px-4 py-3 rounded-xl border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm resize-none bg-emerald-50/30"
                           />
                           <div className="flex justify-end gap-2">
                              <button onClick={() => { setIsEditingNote(false); setEditedNota(notaGerada.conteudo); }} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                              <button onClick={handleSaveNote} disabled={isSavingNote} className="px-4 py-2 bg-emerald-600 text-white font-bold text-sm rounded-lg hover:bg-emerald-700 flex items-center gap-2">
                                {isSavingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Salvar Alterações
                              </button>
                           </div>
                         </div>
                       ) : (
                         <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-200">
                           <div className="flex justify-between items-start mb-3">
                              <span className={`text-xs font-bold px-2 py-1 rounded-full ${notaGerada.status === 'confirmada' ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'}`}>
                                {notaGerada.status === 'confirmada' ? 'Revisada pelo Vet' : 'Rascunho da IA'}
                              </span>
                              <button onClick={() => { setEditedNota(notaGerada.conteudo); setIsEditingNote(true); }} className="text-emerald-700 hover:text-emerald-900 text-sm font-bold underline">
                                Editar Nota
                              </button>
                           </div>
                           <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                             {notaGerada.conteudo}
                           </div>
                         </div>
                       )}
                    </div>
                 )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewAnaliseModal;
