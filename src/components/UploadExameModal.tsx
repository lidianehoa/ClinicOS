import React, { useState } from 'react';
import { X, Upload, File as FileIcon, Loader2, Sparkles, Building2 } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { storage, db } from '../services/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { APP_ID } from '../services/dataService';

interface UploadExameModalProps {
  clientId: string;
  onClose: () => void;
}

const UploadExameModal: React.FC<UploadExameModalProps> = ({ clientId, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [tipoExame, setTipoExame] = useState('');
  const [historico, setHistorico] = useState('');
  const [objetivoAnalise, setObjetivoAnalise] = useState('diagnostico_completo');
  const [focoAnalise, setFocoAnalise] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Campos de Encaminhamento (Outra Clínica)
  const [isEncaminhamento, setIsEncaminhamento] = useState(false);
  const [clinicaOrigem, setClinicaOrigem] = useState('');
  const [crmvOrigem, setCrmvOrigem] = useState('');
  const [motivoEncaminhamento, setMotivoEncaminhamento] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!file || !tipoExame) return;
    if (isEncaminhamento && !clinicaOrigem.trim()) {
      alert('Por favor, informe a Clínica ou Veterinário de Origem do encaminhamento.');
      return;
    }

    setIsUploading(true);
    try {
      const fileId = `exame_${Date.now()}`;
      const storageRef = ref(storage, `artifacts/${APP_ID}/exames/${clientId}/${fileId}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(p);
        }, 
        (error) => {
          console.error('Upload error', error);
          setIsUploading(false);
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          const exameDocId = fileId;
          const examesRef = doc(collection(db!, 'artifacts', APP_ID, 'public', 'data', 'exames'), exameDocId);
          
          const examData: any = {
            id: exameDocId,
            pacienteId: clientId,
            tipo: tipoExame,
            fileUrl: downloadURL,
            dataUpload: new Date().toISOString(),
            status: 'pendente',
            tenantId: APP_ID,
            isEncaminhamento: isEncaminhamento
          };

          if (isEncaminhamento) {
            examData.encaminhamento = {
              clinicaOrigem: clinicaOrigem.trim(),
              crmvOrigem: crmvOrigem.trim() || undefined,
              motivoEncaminhamento: motivoEncaminhamento.trim() || undefined
            };
          }

          await setDoc(examesRef, examData);

          // Chama a Genkit Function (analyzeExam)
          const functions = getFunctions();
          const analyzeExam = httpsCallable(functions, 'analyzeExam');
          
          try {
            await analyzeExam({
              examId: exameDocId,
              pacienteId: clientId,
              fileUrl: downloadURL,
              tipo: tipoExame,
              history: historico + (isEncaminhamento ? `\n[Exame vindo por encaminhamento de ${clinicaOrigem.trim()}]` : ''),
              objetivoAnalise,
              focoAnalise,
              tenantId: APP_ID
            });
          } catch (e) {
            console.error('Error in analyzeExam:', e);
          }

          setIsUploading(false);
          onClose();
        }
      );
    } catch (e) {
      console.error(e);
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Upload de Exame</h2>
            <p className="text-sm text-slate-500">Faça o upload do exame para arquivo e análise com IA</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          <div>
             <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Exame *</label>
             <input 
               type="text" 
               value={tipoExame} 
               onChange={e => setTipoExame(e.target.value)}
               placeholder="Ex: Hemograma, Ultrassom, Raio-X"
               className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-sm" 
             />
          </div>

          {/* Toggle de Encaminhamento de Outra Clínica */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  Encaminhamento de Outra Clínica / Vet?
                </label>
                <p className="text-[11px] text-slate-500">
                  Marque se o exame foi trazido de um atendimento externo.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEncaminhamento}
                  onChange={e => setIsEncaminhamento(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {/* Campos Condicionais do Encaminhamento */}
            {isEncaminhamento && (
              <div className="pt-3 border-t border-slate-200 space-y-3 animate-in fade-in duration-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Clínica / Veterinário de Origem *
                  </label>
                  <input
                    type="text"
                    required
                    value={clinicaOrigem}
                    onChange={e => setClinicaOrigem(e.target.value)}
                    placeholder="Ex: Vet Clinic Centro / Dr. Roberto Silva"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      CRMV do Veterinário (Opcional)
                    </label>
                    <input
                      type="text"
                      value={crmvOrigem}
                      onChange={e => setCrmvOrigem(e.target.value)}
                      placeholder="Ex: CRMV-SP 12345"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Motivo do Encaminhamento (Opcional)
                    </label>
                    <input
                      type="text"
                      value={motivoEncaminhamento}
                      onChange={e => setMotivoEncaminhamento(e.target.value)}
                      placeholder="Ex: Avaliação cardiológica, 2ª opinião..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
             <label className="block text-sm font-bold text-slate-700 mb-1">Objetivo da Análise</label>
             <select 
               value={objetivoAnalise} 
               onChange={e => setObjetivoAnalise(e.target.value)}
               className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-sm bg-white"
             >
               <option value="diagnostico_completo">Diagnóstico clínico completo (Foco amplo)</option>
               <option value="laudo_exame">Laudo de exame (Foco estrito no resultado)</option>
               <option value="triagem_rapida">Triagem rápida (Decisões urgentes)</option>
             </select>
          </div>

          <div>
             <label className="block text-sm font-bold text-slate-700 mb-1">Foco da Análise / Observações para a IA (Opcional)</label>
             <textarea 
               value={focoAnalise}
               onChange={e => setFocoAnalise(e.target.value)}
               placeholder="Ex: Focar na função renal, avaliar risco cirúrgico..."
               rows={2}
               className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-sm resize-none"
             />
          </div>

          <div>
             <label className="block text-sm font-bold text-slate-700 mb-1">Histórico Relevante (Opcional)</label>
             <textarea 
               value={historico}
               onChange={e => setHistorico(e.target.value)}
               placeholder="Sintomas, medicações em uso, suspeita clínica..."
               rows={3}
               className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-sm resize-none"
             />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Arquivo do Exame *</label>
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-pink-300 hover:bg-pink-50 transition-colors relative cursor-pointer">
              <input 
                type="file" 
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {file ? (
                <>
                  <FileIcon className="w-8 h-8 text-pink-500 mb-2" />
                  <p className="text-sm font-bold text-slate-700">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-sm font-bold text-slate-700">Clique ou arraste o arquivo</p>
                  <p className="text-xs text-slate-500 mt-1">PDF, JPG ou PNG até 10MB</p>
                </>
              )}
            </div>
          </div>
          
          {isUploading && (
             <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
               <div className="bg-pink-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
             </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} disabled={isUploading} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer">
            Cancelar
          </button>
          <button 
            onClick={handleUploadAndAnalyze}
            disabled={!file || !tipoExame || (isEncaminhamento && !clinicaOrigem.trim()) || isUploading}
            className="px-5 py-2.5 text-sm font-bold bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-pink-600/20 cursor-pointer"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isUploading ? 'Processando...' : 'Analisar com IA'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadExameModal;
