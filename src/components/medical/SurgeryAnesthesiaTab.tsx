import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { APP_ID, AnesthesiaProtocol, AnesthesiaMedication, Product, Surgery } from '../../services/dataService';
import { Plus, X, Loader2, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  surgery: Surgery;
  onUpdate: (anesthesia: AnesthesiaProtocol) => void;
  disabled?: boolean;
}

type MedSection = 'mpa' | 'induction' | 'maintenanceMedications' | 'analgesia';

const MONITORING_OPTIONS = ['ECG', 'SpO2', 'ETCO2', 'Pressão arterial', 'Temperatura', 'Glicemia', 'Capnografia'];

const ROUTES = ['IV', 'IM', 'SC', 'EV', 'VO', 'Epidural', 'Tópico'];

const inputCls = (disabled?: boolean) =>
  `w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2.5 text-white outline-none text-sm ${disabled ? 'opacity-60 cursor-not-allowed' : 'focus:border-teal-500'} transition-colors`;

interface MedModalState {
  section: MedSection;
  productName: string;
  productId: string;
  dose: string;
  route: string;
  time: string;
  quantity: string;
  unit: string;
}

const SurgeryAnesthesiaTab = ({ surgery, onUpdate, disabled }: Props) => {
  const { t } = useTranslation(['medical', 'common']);
  const [showModal, setShowModal] = useState(false);
  const [modalState, setModalState] = useState<MedModalState>({
    section: 'mpa',
    productName: '',
    productId: '',
    dose: '',
    route: 'IM',
    time: '',
    quantity: '',
    unit: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const anesthesia = surgery.anesthesia;
  const weight = surgery.admission?.admissionWeight || surgery.weight || 0;

  const set = (key: keyof AnesthesiaProtocol, value: any) => {
    onUpdate({ ...anesthesia, [key]: value });
  };

  // Product search
  useEffect(() => {
    if (searchTerm.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'products'), where('status', '==', 'active'));
        const snap = await getDocs(q);
        const term = searchTerm.toLowerCase();
        setSearchResults(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)).filter(p => p.name.toLowerCase().includes(term)).slice(0, 6));
      } catch (err) { console.error(err); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const calculateDose = (doseMgKg: string): string => {
    const doseNum = parseFloat(doseMgKg);
    if (!doseNum || !weight) return '';
    const calc = doseNum * weight;
    return `${calc.toFixed(2)} (para ${weight}kg)`;
  };

  const handleAddMed = () => {
    if (!modalState.productName || !modalState.dose) return;

    const med: AnesthesiaMedication = {
      productId: modalState.productId || undefined,
      productName: modalState.productName,
      dose: modalState.dose,
      calculatedDose: calculateDose(modalState.dose),
      route: modalState.route,
      time: modalState.time,
      quantity: Number(modalState.quantity) || undefined,
      unit: modalState.unit || undefined,
    };

    const section = modalState.section;
    const existing = (anesthesia[section] as AnesthesiaMedication[]) || [];
    onUpdate({ ...anesthesia, [section]: [...existing, med] });
    setShowModal(false);
    setSelectedProduct(null);
    setSearchTerm('');
    setModalState({ section: 'mpa', productName: '', productId: '', dose: '', route: 'IM', time: '', quantity: '', unit: '' });
  };

  const removeMed = (section: MedSection, idx: number) => {
    const existing = [...((anesthesia[section] as AnesthesiaMedication[]) || [])];
    existing.splice(idx, 1);
    onUpdate({ ...anesthesia, [section]: existing });
  };

  const openModal = (section: MedSection) => {
    setModalState(prev => ({ ...prev, section }));
    setShowModal(true);
  };

  const toggleMonitoring = (item: string) => {
    const current = anesthesia.monitoring || [];
    const next = current.includes(item) ? current.filter(m => m !== item) : [...current, item];
    set('monitoring', next);
  };

  const renderMedSection = (label: string, section: MedSection) => {
    const meds: AnesthesiaMedication[] = (anesthesia[section] as AnesthesiaMedication[]) || [];
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-300">{label}</h4>
          {!disabled && (
            <button onClick={() => openModal(section)} className="flex items-center gap-1.5 text-xs font-bold text-teal-400 hover:text-teal-300 transition-colors bg-teal-500/10 px-3 py-1.5 rounded-lg hover:bg-teal-500/20">
              <Plus className="w-3.5 h-3.5" /> {t('medical:surgeries.add_medication', 'Adicionar medicamento')}
            </button>
          )}
        </div>
        {meds.length === 0 ? (
          <p className="text-xs text-slate-600 italic">{t('medical:surgeries.no_medications_added', 'Nenhum medicamento adicionado.')}</p>
        ) : (
          <div className="space-y-2">
            {meds.map((med, i) => (
              <div key={i} className="bg-slate-900/60 border border-white/5 rounded-xl p-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">{med.productName}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {med.dose} • {med.route}
                    {med.time && ` • ${med.time}`}
                    {med.quantity && ` • ${med.quantity} ${med.unit || ''}`}
                  </p>
                  {med.calculatedDose && (
                    <p className="text-xs text-teal-400 mt-1 font-mono">→ Dose calculada: {med.calculatedDose}</p>
                  )}
                </div>
                {!disabled && (
                  <button onClick={() => removeMed(section, i)} className="text-slate-500 hover:text-red-400 p-1 shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const anesthesiaTypes: { value: AnesthesiaProtocol['type'], label: string }[] = [
    { value: 'general', label: t('medical:surgeries.anesth_general', 'Geral') },
    { value: 'epidural', label: t('medical:surgeries.anesth_epidural', 'Epidural') },
    { value: 'local', label: t('medical:surgeries.anesth_local', 'Local') },
    { value: 'loco_regional', label: t('medical:surgeries.anesth_locoregional', 'Locorregional') },
    { value: 'combined', label: t('medical:surgeries.anesth_combined', 'Combinada') },
  ];

  return (
    <div className="p-6 space-y-8">

      {/* TIPO */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">── Tipo de Anestesia ─────────────────</h3>
        <div className="flex flex-wrap gap-3">
          {anesthesiaTypes.map(t => (
            <label key={t.value} className="flex items-center gap-2 cursor-pointer group">
              <div
                onClick={() => !disabled && set('type', t.value)}
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${anesthesia.type === t.value ? 'border-teal-500 bg-teal-500' : 'border-slate-600 group-hover:border-teal-400'}`}
              >
                {anesthesia.type === t.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <span className={`text-sm font-medium ${anesthesia.type === t.value ? 'text-white' : 'text-slate-400'}`}>{t.label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* MPA */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">── Pré-anestésico (MPA) ──────────────</h3>
        {renderMedSection('', 'mpa')}
      </section>

      {/* INDUÇÃO */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">── Indução ───────────────────────────</h3>
        {renderMedSection('', 'induction')}
      </section>

      {/* MANUTENÇÃO */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">── {t('medical:surgeries.maintenance', 'Manutenção')} ────────────────────────</h3>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.maintenance_agent', 'Agente / Descrição de manutenção')}</label>
          <input
            type="text"
            disabled={disabled}
            value={anesthesia.maintenance || ''}
            onChange={e => set('maintenance', e.target.value)}
            placeholder={t('medical:surgeries.maintenance_placeholder', 'Ex: Isoflurano 1,5% — tubo endotraqueal')}
            className={inputCls(disabled)}
          />
        </div>
        {renderMedSection(t('medical:surgeries.maintenance_meds', 'Medicamentos de manutenção'), 'maintenanceMedications')}
      </section>

      {/* ANALGESIA */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">── Analgesia Transoperatória ─────────</h3>
        {renderMedSection('', 'analgesia')}
      </section>

      {/* MONITORAÇÃO */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">── Monitoração ───────────────────────</h3>
        <div className="flex flex-wrap gap-3">
          {MONITORING_OPTIONS.map(opt => {
            const checked = (anesthesia.monitoring || []).includes(opt);
            return (
              <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                <div
                  onClick={() => !disabled && toggleMonitoring(opt)}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${checked ? 'bg-teal-500 border-teal-500' : 'border-slate-600 group-hover:border-teal-400'}`}
                >
                  {checked && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                </div>
                <span className={`text-sm ${checked ? 'text-white font-medium' : 'text-slate-400'}`}>{opt}</span>
              </label>
            );
          })}
        </div>
      </section>

      {/* OBSERVAÇÕES E RECUPERAÇÃO */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">── Observações e Recuperação ─────────</h3>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-400">Observações anestésicas</label>
          <textarea
            disabled={disabled}
            value={anesthesia.anesthesiaNotes || ''}
            onChange={e => set('anesthesiaNotes', e.target.value)}
            rows={3}
            className={inputCls(disabled) + ' resize-none'}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-400">Extubação (HH:MM)</label>
            <input type="time" disabled={disabled} value={anesthesia.extubationTime || ''} onChange={e => set('extubationTime', e.target.value)} className={inputCls(disabled)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-400">Tempo de recuperação (min)</label>
            <input type="number" disabled={disabled} value={anesthesia.recoveryTime || ''} onChange={e => set('recoveryTime', Number(e.target.value))} className={inputCls(disabled)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-400">Observações da recuperação anestésica</label>
          <textarea
            disabled={disabled}
            value={anesthesia.recoveryNotes || ''}
            onChange={e => set('recoveryNotes', e.target.value)}
            rows={2}
            className={inputCls(disabled) + ' resize-none'}
          />
        </div>
      </section>

      {/* MODAL ADICIONAR MEDICAMENTO */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Adicionar Medicamento</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
            </div>

            {/* Product search */}
            <div>
              <label className="text-sm font-bold text-slate-400 block mb-1.5">Medicamento</label>
              {!selectedProduct ? (
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar produto..."
                    className="w-full bg-slate-900 border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-white outline-none focus:border-teal-500 text-sm"
                    autoFocus
                  />
                  {searching && <Loader2 className="w-4 h-4 text-teal-500 absolute right-3 top-2.5 animate-spin" />}
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 top-full mt-1 w-full bg-slate-800 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                      {searchResults.map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedProduct(p);
                            setModalState(prev => ({ ...prev, productId: p.id, productName: p.name, unit: p.unit }));
                            setSearchTerm('');
                            setSearchResults([]);
                          }}
                          className="p-3 border-b border-white/5 hover:bg-white/5 cursor-pointer flex justify-between items-center"
                        >
                          <p className="font-bold text-white text-sm">{p.name}</p>
                          <p className="text-xs text-slate-400">Estoque: {p.currentStock} {p.unit}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-1.5">Ou digite manualmente o nome abaixo:</p>
                  <input
                    type="text"
                    value={modalState.productName}
                    onChange={e => setModalState(prev => ({ ...prev, productName: e.target.value, productId: '' }))}
                    placeholder="Nome do medicamento..."
                    className="w-full mt-1.5 bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500 text-sm"
                  />
                </div>
              ) : (
                <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-3 flex justify-between items-center">
                  <p className="text-teal-400 font-bold text-sm">{selectedProduct.name}</p>
                  <button onClick={() => { setSelectedProduct(null); setModalState(prev => ({ ...prev, productId: '', productName: '', unit: '' })); }} className="text-xs text-teal-400 underline">Trocar</button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-400">Dose (mg/kg ou valor fixo)</label>
                <input
                  type="text"
                  value={modalState.dose}
                  onChange={e => setModalState(prev => ({ ...prev, dose: e.target.value }))}
                  placeholder="0.05 mg/kg"
                  className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2.5 text-white outline-none focus:border-teal-500 text-sm"
                />
                {modalState.dose && weight > 0 && (
                  <p className="text-xs text-teal-400 font-mono">→ {calculateDose(modalState.dose)}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-400">Via</label>
                <select
                  value={modalState.route}
                  onChange={e => setModalState(prev => ({ ...prev, route: e.target.value }))}
                  className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2.5 text-white outline-none focus:border-teal-500 text-sm"
                >
                  {ROUTES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-400">Horário (HH:MM)</label>
                <input type="time" value={modalState.time} onChange={e => setModalState(prev => ({ ...prev, time: e.target.value }))} className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2.5 text-white outline-none focus:border-teal-500 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-400">Qtd usada (para estoque)</label>
                <input
                  type="number"
                  step="0.01"
                  value={modalState.quantity}
                  onChange={e => setModalState(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="1.75"
                  className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2.5 text-white outline-none focus:border-teal-500 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-400 hover:text-white font-bold transition-colors">Cancelar</button>
              <button
                onClick={handleAddMed}
                disabled={!modalState.productName || !modalState.dose}
                className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-bold transition-all"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurgeryAnesthesiaTab;
