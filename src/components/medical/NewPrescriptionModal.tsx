import { useState, useEffect } from 'react';
import { doc, getDocs, collection, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { AppUser, APP_ID, Hospitalization, Product, prescriptionsCol, scheduledDosesCol } from '../../services/dataService';
import { Search, Loader2, X, Check, Calculator } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  hospitalization: Hospitalization;
  userProfile: AppUser | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const NewPrescriptionModal = ({ hospitalization, userProfile, onCancel, onSuccess }: Props) => {
  const { t } = useTranslation(['medical', 'common']);
  const [loading, setLoading] = useState(false);
  const [searchSup, setSearchSup] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dosage, setDosage] = useState('');
  const [route, setRoute] = useState('IV');
  const [frequency, setFrequency] = useState('12/12h');
  
  const now = new Date();
  const [startDate, setStartDate] = useState(now.toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(now.toTimeString().substring(0,5));
  const [duration, setDuration] = useState('5');
  const [instructions, setInstructions] = useState('');

  // Auto calculate dose based on weight if requested
  const [calculatedDose, setCalculatedDose] = useState('');

  // Search product
  useEffect(() => {
    if (searchSup.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'products'), where('status', '==', 'active'));
        const snap = await getDocs(q);
        const term = searchSup.toLowerCase();
        const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
          .filter(p => p.name.toLowerCase().includes(term))
          .slice(0, 5);
        setSearchResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchSup]);

  const generateDoses = () => {
    const dosesToCreate: Array<{ date: string, time: string }> = [];
    if (frequency === 'SOS' || frequency === 'Contínuo') return dosesToCreate; // SOS/Continuo doesn't generate fixed batches

    const startDateTime = new Date(`${startDate}T${startTime}:00`);
    const durationDays = parseInt(duration) || 1;
    const endDateTime = new Date(startDateTime.getTime() + (durationDays * 24 * 60 * 60 * 1000));
    
    let hoursInterval = 24;
    if (frequency === '6/6h') hoursInterval = 6;
    if (frequency === '8/8h') hoursInterval = 8;
    if (frequency === '12/12h') hoursInterval = 12;

    let current = new Date(startDateTime.getTime());
    while (current < endDateTime) {
      dosesToCreate.push({
        date: current.toISOString().split('T')[0],
        time: current.toTimeString().substring(0,5)
      });
      current = new Date(current.getTime() + (hoursInterval * 60 * 60 * 1000));
    }

    return dosesToCreate;
  };

  const handleSave = async () => {
    if (!selectedProduct || !dosage) {
      alert('Selecione o medicamento e a dosagem.');
      return;
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);
      const pRef = doc(prescriptionsCol(APP_ID));
      const nowStr = new Date().toISOString();

      batch.set(pRef, {
        id: pRef.id,
        hospitalizationId: hospitalization.id,
        patientId: hospitalization.patientId,
        patientName: hospitalization.patientName,
        professionalId: userProfile?.staffId || userProfile?.uid,
        professionalName: userProfile?.nome,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        dosage,
        calculatedDose,
        route,
        frequency,
        startDate,
        startTime,
        duration: `${duration} dias`,
        instructions,
        status: 'active',
        tenantId: APP_ID,
        createdAt: nowStr
      });

      const times = generateDoses();
      times.forEach(t => {
        const dRef = doc(scheduledDosesCol(APP_ID));
        batch.set(dRef, {
          id: dRef.id,
          prescriptionId: pRef.id,
          hospitalizationId: hospitalization.id,
          patientId: hospitalization.patientId,
          patientName: hospitalization.patientName,
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          dosage,
          route,
          scheduledDate: t.date,
          scheduledTime: t.time,
          status: 'pending',
          stockDeducted: false,
          tenantId: APP_ID,
          createdAt: nowStr
        });
      });

      await batch.commit();
      onSuccess();
    } catch (err) {
      console.error(err);
      alert(t('medical:hospitalization.error_save_prescription', 'Erro ao salvar prescrição.'));
    } finally {
      setLoading(false);
    }
  };

  const generatedTimes = generateDoses();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-white">{t('medical:hospitalization.new_prescription', 'Nova Prescrição')} — {hospitalization.patientName}</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* SEARCH PRODUCT */}
          {!selectedProduct ? (
            <div className="relative">
              <label className="text-sm font-bold text-slate-300 block mb-1">{t('medical:surgeries.search_med', 'Buscar Medicamento')}</label>
              <div className="relative">
                <Search className="w-5 h-5 text-slate-500 absolute left-3 top-3" />
                <input type="text" value={searchSup} onChange={e => setSearchSup(e.target.value)} placeholder={t('medical:surgeries.search_med_placeholder', 'Digite o nome...')} className="w-full bg-slate-900 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-white outline-none" />
                {searching && <Loader2 className="w-5 h-5 text-teal-500 absolute right-3 top-2.5 animate-spin" />}
              </div>
              {searchResults.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                  {searchResults.map(p => (
                    <div key={p.id} onClick={() => setSelectedProduct(p)} className="p-3 border-b border-white/5 hover:bg-white/5 cursor-pointer">
                      <p className="font-bold text-white">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.unit} • {t('medical:inventory.stock', 'Estoque')}: {p.currentStock}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-teal-400 font-bold text-lg">{selectedProduct.name}</p>
                <p className="text-teal-400/70 text-sm">{t('medical:inventory.unit', 'Unidade')}: {selectedProduct.unit}</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-teal-400 hover:text-teal-300 text-sm font-bold underline">{t('common:change', 'Trocar')}</button>
            </div>
          )}

          {/* FORM */}
          {selectedProduct && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-400">{t('medical:hospitalization.dosage', 'Dosagem')} (ex: 10mg/kg) *</label>
                  <input type="text" value={dosage} onChange={e => setDosage(e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-400">{t('medical:hospitalization.calc_dose', 'Dose Calculada (opcional)')}</label>
                  <div className="relative">
                    <input type="text" value={calculatedDose} onChange={e => setCalculatedDose(e.target.value)} placeholder={`Ex: ${hospitalization.weight ? (hospitalization.weight * 10) + 'mg' : '...'}`} className="w-full bg-slate-900 border border-white/5 rounded-xl pl-4 pr-10 py-2.5 text-white outline-none focus:border-teal-500" />
                    <Calculator className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-400">{t('medical:hospitalization.route', 'Via')}</label>
                  <select value={route} onChange={e => setRoute(e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500">
                    <option value="IV">IV (Intravenoso)</option>
                    <option value="IM">IM (Intramuscular)</option>
                    <option value="SC">SC (Subcutâneo)</option>
                    <option value="VO">VO (Via Oral)</option>
                    <option value="Tópico">Tópico</option>
                    <option value="Inalatório">Inalatório</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-400">{t('medical:hospitalization.frequency', 'Frequência')}</label>
                  <select value={frequency} onChange={e => setFrequency(e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500">
                    <option value="6/6h">6/6h</option>
                    <option value="8/8h">8/8h</option>
                    <option value="12/12h">12/12h</option>
                    <option value="24/24h">24/24h</option>
                    <option value="SOS">SOS (Se necessário)</option>
                    <option value="Contínuo">Contínuo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-400">{t('medical:hospitalization.start_date', 'Data Início')}</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2.5 text-white outline-none focus:border-teal-500 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-400">{t('medical:hospitalization.start_time', 'Hora Início')}</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2.5 text-white outline-none focus:border-teal-500 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-400">{t('medical:hospitalization.duration_days', 'Duração (dias)')}</label>
                  <input type="number" value={duration} onChange={e => setDuration(e.target.value)} min="1" className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2.5 text-white outline-none focus:border-teal-500 text-sm" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-400">{t('medical:hospitalization.add_instructions', 'Instruções adicionais')}</label>
                <input type="text" value={instructions} onChange={e => setInstructions(e.target.value)} placeholder={t('medical:hospitalization.instructions_ex', 'Ex: Diluir em 10ml de NaCl')} className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500" />
              </div>

              {generatedTimes.length > 0 && (
                <div className="bg-black/20 rounded-xl p-4 mt-2">
                  <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">{t('medical:hospitalization.gen_times', 'Horários Gerados')} ({generatedTimes.length} {t('medical:hospitalization.doses', 'doses')})</p>
                  <div className="flex flex-wrap gap-2">
                    {generatedTimes.map((t, idx) => (
                      <span key={idx} className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded font-mono border border-white/5">
                        {t.date.split('-').reverse().join('/').substring(0,5)} {t.time}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/5 flex items-center justify-end gap-3 shrink-0 bg-slate-900/50">
          <button onClick={onCancel} disabled={loading} className="px-5 py-2.5 rounded-xl font-bold text-slate-400 hover:bg-white/5 hover:text-white transition-colors">{t('common:cancel', 'Cancelar')}</button>
          <button onClick={handleSave} disabled={loading || !selectedProduct || !dosage} className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />} {t('medical:hospitalization.save_prescription', 'Salvar Prescrição')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewPrescriptionModal;
