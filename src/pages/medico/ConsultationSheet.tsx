import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { AppUser, APP_ID, Consultation, SupplyUsed, Product } from '../../services/dataService';
import PatientTimeline from '../../components/medical/PatientTimeline';
import FinalizeConsultationModal from '../../components/medical/FinalizeConsultationModal';
import ConsultationPrintView from '../../components/medical/ConsultationPrintView';
import { ChevronLeft, Save, CheckCircle, Plus, Trash2, Search, Loader2, Syringe, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  consultationId: string;
  userProfile: AppUser | null;
  onBack: () => void;
}

const EXAM_SYSTEMS = [
  { id: 'hidratacao', label: 'B) Hidratação' },
  { id: 'mucosas', label: 'C) Mucosas' },
  { id: 'olhos', label: 'D) Olhos' },
  { id: 'ouvidos', label: 'E) Ouvidos' },
  { id: 'pele', label: 'F) Pele/Pelagem' },
  { id: 'linfonodos', label: 'G) Linfonodos' },
  { id: 'cardiorrespiratorio', label: 'H) Sist. Cardiorrespiratório' },
  { id: 'digestorio', label: 'I) Sist. Digestório' },
  { id: 'geniturinario', label: 'J) Sist. Geniturinário' },
  { id: 'locomotor', label: 'K) Sist. Locomotor' },
  { id: 'neurologico', label: 'L) Sist. Neurológico' },
  { id: 'reprodutor', label: 'M) Sist. Reprodutor' },
] as const;

const ConsultationSheet = ({ consultationId, onBack }: Props) => {
  const { t } = useTranslation(['medical', 'common']);
  const [data, setData] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showFinalize, setShowFinalize] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  // Supples Search State
  const [searchSup, setSearchSup] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  // Vaccines Summary State
  const [vaccines, setVaccines] = useState<any[]>([]);

  useEffect(() => {
    const fetchVaccines = async () => {
      if (!data?.patientId) return;
      try {
        const q = query(
          collection(db, 'artifacts', APP_ID, 'public', 'data', 'records'), 
          where('patientId', '==', data.patientId),
          where('type', '==', 'vaccine')
        );
        const snap = await getDocs(q);
        const vacs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        vacs.sort((a, b) => {
          const dtA = new Date(`${a.date}T${a.time || '00:00:00'}`);
          const dtB = new Date(`${b.date}T${b.time || '00:00:00'}`);
          return dtB.getTime() - dtA.getTime();
        });
        setVaccines(vacs.slice(0, 3));
      } catch (err) {
        console.error('Error fetching vaccines', err);
      }
    };
    fetchVaccines();
  }, [data?.patientId]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const cRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'consultations', consultationId);
        const snap = await getDoc(cRef);
        if (snap.exists()) {
          const d = snap.data() as Consultation;
          d.suppliesUsed = d.suppliesUsed || [];
          d.prescription = d.prescription || [];
          setData({ ...d, id: snap.id });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [consultationId]);

  const handleSave = async (auto = false) => {
    if (!data) return;
    if (!auto) setSaving(true);
    try {
      const cRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'consultations', consultationId);
      await updateDoc(cRef, {
        ...data,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
      if (!auto) alert('Erro ao salvar rascunho.');
    } finally {
      if (!auto) setSaving(false);
    }
  };

  // Debounced Auto-save
  useEffect(() => {
    if (!data || data.status === 'completed') return;
    const timer = setTimeout(() => {
      handleSave(true);
    }, 5000); // 5s debounced save
    return () => clearTimeout(timer);
  }, [data]);

  const handleUpdate = (field: keyof Consultation, value: any) => {
    setData(prev => prev ? { ...prev, [field]: value } : null);
  };

  // --- Supplies Logic ---
  useEffect(() => {
    if (searchSup.length < 2) {
      setSearchResults([]);
      return;
    }
    const search = async () => {
      setSearching(true);
      try {
        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'products'), where('status', '==', 'active'));
        const snap = await getDocs(q);
        const term = searchSup.toLowerCase();
        const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
          .filter(p => p.type === 'product' && p.name.toLowerCase().includes(term))
          .slice(0, 5);
        setSearchResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    };
    const timer = setTimeout(search, 500);
    return () => clearTimeout(timer);
  }, [searchSup]);

  const addSupply = (p: Product) => {
    if (!data) return;
    const qty = prompt(t('medical:prompt_quantity', 'Quantidade de {{name}} ({{unit}}):', { name: p.name, unit: p.unit }), '1');
    if (!qty || isNaN(Number(qty))) return;
    
    const qtyNum = Number(qty);
    const newSupply: SupplyUsed = {
      productId: p.id,
      productName: p.name,
      quantity: qtyNum,
      unit: p.unit || 'UN',
      unitCost: p.costPrice || 0,
      totalCost: (p.costPrice || 0) * qtyNum
    };

    handleUpdate('suppliesUsed', [...data.suppliesUsed, newSupply]);
    setSearchSup('');
    setSearchResults([]);
  };

  const removeSupply = (index: number) => {
    if (!data) return;
    const newList = [...data.suppliesUsed];
    newList.splice(index, 1);
    handleUpdate('suppliesUsed', newList);
  };

  if (loading || !data) {
    return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 text-teal-500 animate-spin" /></div>;
  }

  const isCompleted = data.status === 'completed';

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" /> {t('common:back', 'Voltar')}
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowPrint(true)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 border border-slate-700">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
          {!isCompleted && (
            <button onClick={() => handleSave()} disabled={saving} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('medical:consultation.save_draft', 'Salvar Rascunho')}
            </button>
          )}
          {!isCompleted && (
            <button onClick={() => setShowFinalize(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> {t('medical:consultation.finalize', 'Finalizar Consulta')}
            </button>
          )}
          {isCompleted && (
            <div className="bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> {t('medical:consultation.finalized_status', 'Consulta Finalizada')}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        
        {/* COLUNA ESQUERDA - FICHA CLINICA */}
        <div className="lg:col-span-2 bg-slate-800 border border-white/5 rounded-2xl overflow-y-auto overflow-x-hidden p-6 space-y-8 scrollbar-thin">
          
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                🐾 {data.patientName}
              </h1>
              <p className="text-slate-400 mt-1">{t('medical:consultation.owner', 'Dono:')} <span className="text-slate-300">{data.clientName}</span></p>
            </div>
            <div className="text-right text-sm">
              <p className="text-teal-400 font-bold">{data.consultationType || t('medical:consultation.general', 'Consulta Geral')}</p>
              <p className="text-slate-400">{data.date.split('-').reverse().join('/')} • {data.professionalName}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Peso (kg)</label><input type="number" step="0.1" disabled={isCompleted} value={data.weight || ''} onChange={e => handleUpdate('weight', Number(e.target.value))} className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-white outline-none" /></div>
            <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Temp (°C)</label><input type="number" step="0.1" disabled={isCompleted} value={data.temperature || ''} onChange={e => handleUpdate('temperature', Number(e.target.value))} className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-white outline-none" /></div>
            <div className="space-y-1"><label className="text-xs font-bold text-slate-500">FC (bpm)</label><input type="number" disabled={isCompleted} value={data.heartRate || ''} onChange={e => handleUpdate('heartRate', Number(e.target.value))} className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-white outline-none" /></div>
            <div className="space-y-1"><label className="text-xs font-bold text-slate-500">FR (rpm)</label><input type="number" disabled={isCompleted} value={data.respiratoryRate || ''} onChange={e => handleUpdate('respiratoryRate', Number(e.target.value))} className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-white outline-none" /></div>
            <div className="space-y-1"><label className="text-xs font-bold text-slate-500">TPC (seg)</label><input type="number" disabled={isCompleted} value={data.tpc || ''} onChange={e => handleUpdate('tpc', Number(e.target.value))} className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-white outline-none" /></div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Mucosas</label>
              <select disabled={isCompleted} value={data.mucosas || ''} onChange={e => handleUpdate('mucosas', e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-white outline-none">
                <option value=""></option><option value="Roseas">Róseas</option><option value="Palidas">Pálidas</option><option value="Ictericas">Ictéricas</option><option value="Cianoticas">Cianóticas</option><option value="Congestas">Congestas</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Hidratação</label>
              <select disabled={isCompleted} value={data.hydration || ''} onChange={e => handleUpdate('hydration', e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-white outline-none">
                <option value=""></option><option value="Normal">Normal</option><option value="Desidratado <5%">Desidratado &lt;5%</option><option value="Desidratado 5-8%">Desidratado 5-8%</option><option value="Desidratado >8%">Desidratado &gt;8%</option>
              </select>
            </div>
            <div className="space-y-1"><label className="text-xs font-bold text-slate-500">PA (mmHg)</label><input type="text" disabled={isCompleted} value={data.bloodPressure || ''} onChange={e => handleUpdate('bloodPressure', e.target.value)} placeholder="120/80" className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-white outline-none" /></div>
          </div>

          <div className="space-y-6">
            {/* RESUMO VACINAL */}
            <div className="bg-slate-900 border border-emerald-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <Syringe className="w-4 h-4" /> {t('medical:vaccines.vaccine', 'Resumo Vacinal')}
                </h3>
              </div>
              {vaccines.length > 0 ? (
                <div className="space-y-2">
                  {vaccines.map(v => (
                    <div key={v.id} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                      <span className="text-white">{v.title}</span>
                      <span className="text-slate-400">{v.date?.split('-').reverse().join('/')}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Nenhuma vacina registrada recentemente.</p>
              )}
            </div>

            <div>
              <label className="text-sm font-bold text-slate-300 mb-2 block">QUEIXA PRINCIPAL</label>
              <textarea disabled={isCompleted} value={data.chiefComplaint || ''} onChange={e => handleUpdate('chiefComplaint', e.target.value)} className="w-full h-20 bg-slate-900 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-teal-500 resize-none" />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-300 mb-2 block">ANAMNESE</label>
              <textarea disabled={isCompleted} value={data.anamnesis || ''} onChange={e => handleUpdate('anamnesis', e.target.value)} className="w-full h-24 bg-slate-900 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-teal-500 resize-none" />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-300 mb-2 block">EXAME FÍSICO</label>
              <div className="bg-slate-900 border border-white/5 rounded-xl p-4 space-y-6">
                
                {/* A) Avaliação Nutricional */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-white/5 pb-4">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">A) Avaliação Nutricional</p>
                    <p className="text-xs text-slate-400">Escore de 1 a 9</p>
                  </div>
                  <select 
                    disabled={isCompleted}
                    value={data.physicalExamChecklist?.nutricional || ''}
                    onChange={e => handleUpdate('physicalExamChecklist', { ...data.physicalExamChecklist, nutricional: e.target.value })}
                    className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white outline-none w-24"
                  >
                    <option value=""></option>
                    {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={String(n)}>{n}</option>)}
                  </select>
                </div>

                {/* B ao M */}
                {EXAM_SYSTEMS.map(sys => {
                  const check = (data.physicalExamChecklist as any)?.[sys.id];
                  const status = check?.status || '';
                  const notes = check?.notes || '';
                  return (
                    <div key={sys.id} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <p className="text-sm font-bold text-white flex-1">{sys.label}</p>
                        <div className="flex bg-slate-800 p-1 rounded-lg shrink-0">
                          <button
                            disabled={isCompleted}
                            onClick={() => handleUpdate('physicalExamChecklist', { ...data.physicalExamChecklist, [sys.id]: { status: status === 'Normal' ? '' : 'Normal', notes: status === 'Normal' ? '' : notes } })}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${status === 'Normal' ? 'bg-teal-500 text-white' : 'text-slate-400 hover:text-white'}`}
                          >
                            Normal
                          </button>
                          <button
                            disabled={isCompleted}
                            onClick={() => handleUpdate('physicalExamChecklist', { ...data.physicalExamChecklist, [sys.id]: { status: status === 'Alterado' ? '' : 'Alterado', notes } })}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${status === 'Alterado' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'}`}
                          >
                            Alterado
                          </button>
                        </div>
                      </div>
                      {status === 'Alterado' && (
                        <div className="mt-3">
                          <input 
                            disabled={isCompleted}
                            type="text" 
                            placeholder="Descreva a alteração..." 
                            value={notes}
                            onChange={e => handleUpdate('physicalExamChecklist', { ...data.physicalExamChecklist, [sys.id]: { status, notes: e.target.value } })}
                            className="w-full bg-slate-950 border border-rose-500/30 focus:border-rose-500 rounded-lg px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 transition-colors"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="text-sm font-bold text-slate-300 mb-2 block">DIAGNÓSTICO / SUSPEITA</label>
              <textarea disabled={isCompleted} value={data.diagnosis || ''} onChange={e => handleUpdate('diagnosis', e.target.value)} className="w-full h-20 bg-slate-900 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-teal-500 resize-none" />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-300 mb-2 block">CONDUTA / TRATAMENTO</label>
              <textarea disabled={isCompleted} value={data.treatment || ''} onChange={e => handleUpdate('treatment', e.target.value)} className="w-full h-24 bg-slate-900 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-teal-500 resize-none" />
            </div>
          </div>

          {/* INSUMOS */}
          <div className="pt-4 border-t border-white/5">
            <h3 className="text-sm font-bold text-teal-400 mb-4 tracking-widest uppercase">── {t('medical:consultation.supplies_used', 'Insumos e Medicamentos Usados')} ────────</h3>
            
            {!isCompleted && (
              <div className="mb-4 relative z-10">
                <div className="flex items-center gap-2 bg-slate-900 border border-white/5 rounded-xl px-3 py-2.5">
                  <Search className="w-4 h-4 text-slate-500" />
                  <input type="text" value={searchSup} onChange={e => setSearchSup(e.target.value)} placeholder="Buscar produto por nome..." className="flex-1 bg-transparent text-sm text-white outline-none" />
                  {searching && <Loader2 className="w-4 h-4 text-teal-500 animate-spin" />}
                </div>
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                    {searchResults.map(p => (
                      <div key={p.id} onClick={() => addSupply(p)} className="px-4 py-3 hover:bg-white/5 cursor-pointer flex justify-between items-center border-b border-white/5 last:border-0">
                        <div>
                          <p className="text-sm text-white font-bold">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.unit} • Estoque: {p.currentStock}</p>
                        </div>
                        <Plus className="w-4 h-4 text-teal-500" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {data.suppliesUsed.length > 0 ? (
              <table className="w-full text-left text-sm mt-4">
                <thead className="text-slate-400">
                  <tr className="border-b border-white/5"><th className="pb-2 font-medium">Produto</th><th className="pb-2 font-medium">Qtd</th><th className="pb-2 font-medium">Unid</th>{!isCompleted && <th></th>}</tr>
                </thead>
                <tbody className="text-slate-300 divide-y divide-white/5">
                  {data.suppliesUsed.map((sup, idx) => (
                    <tr key={idx}><td className="py-3 font-medium text-white">{sup.productName}</td><td className="py-3">{sup.quantity}</td><td className="py-3">{sup.unit}</td>{!isCompleted && <td className="py-3 text-right"><button onClick={() => removeSupply(idx)} className="text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg"><Trash2 className="w-4 h-4" /></button></td>}</tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-slate-500 text-sm">Nenhum insumo adicionado.</p>
            )}
          </div>

        </div>

        {/* COLUNA DIREITA - TIMELINE */}
        <div className="h-full">
          <PatientTimeline patientId={data.patientId} />
        </div>

      </div>

      {showFinalize && (
        <FinalizeConsultationModal 
          consultationId={data.id} 
          supplies={data.suppliesUsed} 
          onConfirm={() => {
            setShowFinalize(false);
            onBack();
          }} 
          onCancel={() => setShowFinalize(false)} 
        />
      )}

      {showPrint && data && (
        <ConsultationPrintView consultation={data} onClose={() => setShowPrint(false)} />
      )}
    </div>
  );
};

export default ConsultationSheet;
