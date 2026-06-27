import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { AppUser, APP_ID, Consultation, SupplyUsed, Product } from '../../services/dataService';
import PatientTimeline from '../../components/medical/PatientTimeline';
import FinalizeConsultationModal from '../../components/medical/FinalizeConsultationModal';
import { ChevronLeft, Save, CheckCircle, Plus, Trash2, Search, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  consultationId: string;
  userProfile: AppUser | null;
  onBack: () => void;
}

const ConsultationSheet = ({ consultationId, onBack }: Props) => {
  const { t } = useTranslation(['medical', 'common']);
  const [data, setData] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showFinalize, setShowFinalize] = useState(false);

  // Supples Search State
  const [searchSup, setSearchSup] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

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
              <textarea disabled={isCompleted} value={data.physicalExam || ''} onChange={e => handleUpdate('physicalExam', e.target.value)} className="w-full h-24 bg-slate-900 border border-white/5 rounded-xl p-3 text-white outline-none focus:border-teal-500 resize-none" />
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
    </div>
  );
};

export default ConsultationSheet;
