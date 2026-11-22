import { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Activity,
  AlertCircle,
  Save,
  Sparkles,
  RefreshCw,
  FileText,
  FileSearch,
  Loader2,
  Pill,
  FileCheck2
} from 'lucide-react';
import { 
  subscribeCasoClinico, 
  subscribeAnalisesPorCaso,
  updateCasoClinico,
  getActiveTenantId,
  getCustomer,
  getPaciente,
  getResponsavel,
  type Customer,
  type CasoClinico, 
  type AnaliseClinica,
  type Paciente,
  type Responsavel
} from '../../services/dataService';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { storage, db } from '../../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import AddAnaliseToRecordModal from '../../components/medical/AddAnaliseToRecordModal';
import GerarDocumentoModal from '../../components/GerarDocumentoModal';
import ReceitaDigitalModal from '../../components/ReceitaDigitalModal';
import { subscribeNotas, type NotaExplicativa } from '../../services/dataService';

const CasoClinicoDetail = ({ userProfile }: any) => {
  const [casoId, setCasoId] = useState<string | null>(null);
  const [caso, setCaso] = useState<CasoClinico | null>(null);
  const [analises, setAnalises] = useState<AnaliseClinica[]>([]);
  const [notas, setNotas] = useState<NotaExplicativa[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [selectedAnaliseForRecord, setSelectedAnaliseForRecord] = useState<AnaliseClinica | null>(null);
  const [showGerarReceita, setShowGerarReceita] = useState(false);
  const [showReceitaDigital, setShowReceitaDigital] = useState(false);
  const [initialReceitaContent, setInitialReceitaContent] = useState('');
  const [patientWeight, setPatientWeight] = useState<number | undefined>(undefined);

  const [editSintomas, setEditSintomas] = useState('');
  const [editHistorico, setEditHistorico] = useState('');
  const [editIsDomiciliar, setEditIsDomiciliar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [file, setFile] = useState<File | null>(null);
  const [novoExameTipo, setNovoExameTipo] = useState('');
  const [objetivoAnalise, setObjetivoAnalise] = useState('diagnostico_completo');
  const [focoAnalise, setFocoAnalise] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    setCasoId(id);
    
    if (id) {
      const unsubCaso = subscribeCasoClinico(id, (c) => {
        setCaso(c);
        if (c && !editSintomas && !editHistorico) { // only set on first load
          setEditSintomas(c.sintomasPrincipais || '');
          setEditHistorico(c.historicoClinico || '');
          setEditIsDomiciliar(c.isDomiciliar || false);
        }
      });
      const unsubAnalises = subscribeAnalisesPorCaso(id, setAnalises);
      return () => {
        unsubCaso();
        unsubAnalises();
      };
    }
  }, []);

  useEffect(() => {
    if (caso?.pacienteId) {
       const unsub = subscribeNotas(caso.pacienteId, setNotas);
       // Busca dados do paciente/tutor para o documento
       getPaciente(caso.pacienteId).then((paciente: Paciente | null) => {
         if (paciente) {
           setPatientWeight(paciente.peso);
           getResponsavel(paciente.tutorId).then((responsavel: Responsavel | null) => {
             setCustomer({
               id: responsavel?.id || paciente.tutorId,
               nome: responsavel?.nomeCompleto || 'Tutor de ' + paciente.nome,
               animal: paciente.nome,
               cpf: responsavel?.cpf,
               telefone: responsavel?.telefone,
               endereco: responsavel?.endereco,
               email: responsavel?.email,
               animais: [{ id: paciente.id, nome: paciente.nome, especie: paciente.especie, raca: paciente.raca }]
             } as any);
           });
         } else {
           getCustomer(caso.pacienteId).then(c => setCustomer(c)).catch(() => {});
         }
       }).catch(() => {});
       return () => unsub();
    }
  }, [caso?.pacienteId]);



  const initialSnapshot = useMemo(() => {
    if (!caso) return { sintomas: '', historico: '', isDomiciliar: false };
    return {
      sintomas: (caso.sintomasPrincipais || '').trim(),
      historico: (caso.historicoClinico || '').trim(),
      isDomiciliar: caso.isDomiciliar || false,
    };
  }, [caso?.id, caso?.sintomasPrincipais, caso?.historicoClinico, caso?.isDomiciliar]);

  const hasChanges = Boolean(
    editSintomas.trim() !== initialSnapshot.sintomas ||
    editHistorico.trim() !== initialSnapshot.historico ||
    editIsDomiciliar !== initialSnapshot.isDomiciliar
  );

  const hasNewExam = file !== null && Boolean(novoExameTipo.trim());

  // Se já existem análises anteriores, trava a geração até que haja uma alteração real ou novo anexo
  const canGenerate = (analises.length === 0) || hasChanges || hasNewExam;

  const handleSaveChanges = async () => {
    if (!casoId || !hasChanges) return;
    setIsSaving(true);
    try {
      await updateCasoClinico(casoId, {
        sintomasPrincipais: editSintomas,
        historicoClinico: editHistorico,
        isDomiciliar: editIsDomiciliar
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGerarNovaAnalise = async () => {
    if (!casoId || !caso) return;
    setIsAnalyzing(true);
    try {
      // First save changes if any
      if (hasChanges) {
        await handleSaveChanges();
      }

      let novoExameId = '';
      let novoExameFileUrl = '';
      
      if (file && novoExameTipo) {
        const storageRef = ref(storage, `exames/${caso.pacienteId}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snap) => setUploadProgress((snap.bytesTransferred / snap.totalBytes) * 100),
            (err) => reject(err),
            async () => {
              novoExameFileUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });

        novoExameId = `exame_${Date.now()}`;
        const exameDocRef = doc(db, 'artifacts', 'clinicos_demo', 'public', 'data', 'exames', novoExameId);
        await setDoc(exameDocRef, {
          id: novoExameId,
          pacienteId: caso.pacienteId,
          tipo: novoExameTipo,
          fileUrl: novoExameFileUrl,
          dataUpload: new Date().toISOString(),
          status: 'pendente'
        });

        // Update caso with new exam id
        await updateCasoClinico(casoId, {
          examesIds: [...(caso.examesIds || []), novoExameId]
        });
      }

      const functions = getFunctions();
      const analyzeCasoFn = httpsCallable(functions, 'analyzeCaso');
      
      await analyzeCasoFn({
        casoId,
        tenantId: getActiveTenantId(),
        novoExameId,
        novoExameFileUrl,
        novoExameTipo,
        objetivoAnalise,
        focoAnalise
      });
      
      setFile(null);
      setNovoExameTipo('');
      setFocoAnalise('');
      
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar análise.');
    } finally {
      setIsAnalyzing(false);
      setUploadProgress(0);
    }
  };

  if (!casoId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
        <AlertCircle className="w-12 h-12 mb-4 text-slate-300" />
        <p>Caso não encontrado.</p>
        <button onClick={() => window.location.href = '/?tab=assistente'} className="mt-4 text-teal-600 font-semibold hover:underline">
          Voltar para Assistente IA
        </button>
      </div>
    );
  }

  if (!caso) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  // Layout Principal

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
      <header className="flex items-center gap-4 mb-4">
        <button 
          onClick={() => window.location.href = '/?tab=assistente'}
          className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            Caso Clínico (ID: {casoId.slice(-6)})
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Paciente ID: {caso.pacienteId}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Pane - Formulário Evolução */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-500" />
              Sintomas e Histórico
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sintomas Principais</label>
                <textarea
                  value={editSintomas}
                  onChange={(e) => setEditSintomas(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all resize-none h-24 text-sm text-slate-600"
                  placeholder="Ex: Vômito há 3 dias..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Histórico Clínico</label>
                <textarea
                  value={editHistorico}
                  onChange={(e) => setEditHistorico(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all resize-none h-32 text-sm text-slate-600"
                  placeholder="Ex: Paciente diabético..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDomiciliarToggle"
                  checked={editIsDomiciliar}
                  onChange={(e) => setEditIsDomiciliar(e.target.checked)}
                  className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                />
                <label htmlFor="isDomiciliarToggle" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Atendimento Domiciliar (Gera Conduta Específica)
                </label>
              </div>

              {hasChanges && (
                <button 
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-2 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Alterações
                </button>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100 rounded-3xl p-6 shadow-sm">
            <h2 className="font-semibold text-indigo-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              Nova Evolução IA
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-indigo-900 mb-1">Anexar Novo Exame</label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-indigo-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 cursor-pointer"
                />
              </div>

              {file && (
                <div>
                  <label className="block text-sm font-medium text-indigo-900 mb-1">Tipo de Exame</label>
                  <input 
                    type="text"
                    value={novoExameTipo}
                    onChange={(e) => setNovoExameTipo(e.target.value)}
                    placeholder="Ex: Hemograma"
                    className="w-full px-3 py-2 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-indigo-900 mb-1">Tipo de Auxílio</label>
                <select 
                  value={objetivoAnalise}
                  onChange={(e) => setObjetivoAnalise(e.target.value)}
                  className="w-full px-3 py-2 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                >
                  <option value="triagem">Triagem Rápida (Flash Lite)</option>
                  <option value="laudo">Laudo de Exame (Flash Lite)</option>
                  <option value="diagnostico_completo">Diagnóstico Clínico Completo (Pro)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-indigo-900 mb-1">Instruções de Foco (Opcional)</label>
                <textarea
                  value={focoAnalise}
                  onChange={(e) => setFocoAnalise(e.target.value)}
                  placeholder="Ex: Focar na alteração hepática"
                  className="w-full px-3 py-2 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-16 text-sm bg-white"
                />
              </div>

              <button
                onClick={handleGerarNovaAnalise}
                disabled={isAnalyzing || !canGenerate || (file !== null && !novoExameTipo)}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processando... {uploadProgress > 0 && uploadProgress < 100 && `${Math.round(uploadProgress)}%`}
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Gerar Análise Evolutiva
                  </>
                )}
              </button>
              {!canGenerate && !isAnalyzing && (
                <p className="text-[10px] text-center text-indigo-400">
                  Altere os sintomas/histórico ou anexe um novo exame para evoluir o caso.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Pane - Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm min-h-[60vh]">
            <h2 className="font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-teal-500" />
              Linha do Tempo da Análise
            </h2>

            {caso.resumoCaso && (
              <div className="mb-6 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Resumo Consolidado pela IA</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{caso.resumoCaso}</p>
              </div>
            )}

            {analises.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p>Nenhuma análise gerada ainda para este caso.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {analises.map((a, i) => {
                  const isLast = i === 0;
                  const notaVinculada = notas.find(n => n.analiseId === a.id && n.status === 'confirmada');

                  return (
                    <div key={a.id} className={`p-5 rounded-2xl border ${isLast ? 'border-teal-200 bg-teal-50/30' : 'border-slate-200'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-slate-800">
                            {isLast ? 'Análise Mais Recente' : `Evolução de ${new Date(a.dataAnalise).toLocaleDateString('pt-BR')}`}
                          </h3>
                          <span className="text-xs text-slate-500">{new Date(a.dataAnalise).toLocaleString('pt-BR')}</span>
                        </div>
                        {notaVinculada ? (
                          <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold border border-emerald-200">
                            <Sparkles className="w-3 h-3" />
                            Adicionada ao Prontuário em {new Date(notaVinculada.geradaEm).toLocaleDateString('pt-BR')}
                          </span>
                        ) : (
                          <button
                            onClick={() => setSelectedAnaliseForRecord(a)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1.5"
                          >
                            <FileText className="w-3 h-3" />
                            Adicionar ao Prontuário
                          </button>
                        )}
                      </div>
                      
                      {a.achados && a.achados.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-bold text-slate-500 mb-1">Achados Principais:</p>
                          <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                            {a.achados.map((ach, idx) => <li key={idx}>{ach}</li>)}
                          </ul>
                        </div>
                      )}
                      
                      {a.diferenciais && a.diferenciais.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-bold text-slate-500 mb-1">Diagnósticos Diferenciais:</p>
                          <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                            {a.diferenciais.map((dif, idx) => <li key={idx}>{typeof dif === 'string' ? dif : dif.diagnostico}</li>)}
                          </ul>
                        </div>
                      )}

                      {a.condutaSugerida && (
                        <div>
                          <p className="text-xs font-bold text-slate-500 mb-1">Conduta Sugerida:</p>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap bg-white p-3 rounded-xl border border-slate-100">{a.condutaSugerida}</p>
                        </div>
                      )}

                      {a.prescricoesSugeridas && a.prescricoesSugeridas.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <p className="text-xs font-bold text-slate-500 mb-2">Prescrições Sugeridas pela IA:</p>
                          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 mb-3">
                            <ul className="list-disc pl-5 text-sm text-indigo-900 space-y-1">
                              {a.prescricoesSugeridas.map((presc, idx) => <li key={idx}>{presc}</li>)}
                            </ul>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => {
                                setInitialReceitaContent(a.prescricoesSugeridas!.join('\n\n'));
                                setShowGerarReceita(true);
                              }}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-2"
                            >
                              <Pill className="w-4 h-4" />
                              Receita Impressa
                            </button>
                            <button
                              onClick={() => {
                                setInitialReceitaContent(a.prescricoesSugeridas!.join('\n\n'));
                                setShowReceitaDigital(true);
                              }}
                              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-2"
                            >
                              <FileCheck2 className="w-4 h-4" />
                              Assinar Digitalmente (ICP-Brasil)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedAnaliseForRecord && (
        <AddAnaliseToRecordModal
          userProfile={userProfile}
          caso={caso}
          analise={selectedAnaliseForRecord}
          onCancel={() => setSelectedAnaliseForRecord(null)}
          onSuccess={() => {
             setSelectedAnaliseForRecord(null);
             // The badge will appear automatically due to the realtime listener on notas.
          }}
        />
      )}

      {showGerarReceita && caso && (
        <GerarDocumentoModal
          clientId={caso.pacienteId}
          patientName={customer?.animal || customer?.animais?.[0]?.nome || caso.pacienteId}
          tutorName={customer?.nome}
          tutorData={{
            nome: customer?.nome,
            cpf: customer?.cpf,
            telefone: customer?.telefone,
            endereco: customer?.endereco,
          }}
          userProfile={userProfile}
          initialType="receita_simples"
          mode="receita"
          initialClinicalContent={initialReceitaContent}
          patientWeight={patientWeight}
          onClose={() => setShowGerarReceita(false)}
        />
      )}

      {showReceitaDigital && caso && (
        <ReceitaDigitalModal
          isOpen={showReceitaDigital}
          onClose={() => setShowReceitaDigital(false)}
          pacienteId={caso.pacienteId}
          pacienteNome={customer?.animal || customer?.animais?.[0]?.nome || caso.pacienteId}
          pacientePeso={patientWeight}
          tutorNome={customer?.nome}
          tutorCpf={customer?.cpf}
          tutorTelefone={customer?.telefone}
          tutorEndereco={customer?.endereco}
          initialClinicalContent={initialReceitaContent}
          initialTipo="receita_simples"
          userProfile={userProfile}
        />
      )}
    </div>
  );
};

export default CasoClinicoDetail;
