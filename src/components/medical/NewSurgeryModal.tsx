import { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import {
  AppUser, APP_ID, Customer, Animal, searchCustomers,
  surgeriesCol, subscribeStaff, StaffMember, Surgery, SurgicalAdmission,
  AnesthesiaProtocol, SurgicalProcedure, PostOperative
} from '../../services/dataService';
import { Search, Loader2, X, Check, Scissors } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  userProfile: AppUser | null;
  onCancel: () => void;
  onSuccess: (id: string) => void;
}

const defaultAdmission: SurgicalAdmission = {
  asaClassification: 'I',
  fastingConfirmed: false,
  consentSigned: false,
  surgicalPurpose: '',
  clinicalIndication: '',
};

const defaultAnesthesia: AnesthesiaProtocol = {
  type: 'general',
  mpa: [],
  induction: [],
  maintenance: '',
  monitoring: [],
};

const defaultProcedure: SurgicalProcedure = {
  procedureName: '',
  procedureDescription: '',
  biopsySent: false,
};

const defaultPostOp: PostOperative = {
  instructions: '',
  homeMedications: [],
};

const NewSurgeryModal = ({ userProfile, onCancel, onSuccess }: Props) => {
  const { t } = useTranslation(['medical', 'common']);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);

  // Form
  const [procedureName, setProcedureName] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [estimatedDuration, setEstimatedDuration] = useState('60');
  const [surgeonId, setSurgeonId] = useState(userProfile?.staffId || userProfile?.uid || '');
  const [surgeonName, setSurgeonName] = useState(userProfile?.nome || '');
  const [anesthesiologistId, setAnesthesiologistId] = useState('');
  const [anesthesiologistName, setAnesthesiologistName] = useState('');
  const [assistantId, setAssistantId] = useState('');
  const [assistantName, setAssistantName] = useState('');

  useEffect(() => {
    const unsub = subscribeStaff(setStaff);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (searchTerm.length < 3) { setCustomers([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchCustomers(searchTerm);
        setCustomers(results.slice(0, 5));
      } catch (err) { console.error(err); }
      finally { setSearching(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSurgeonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const s = staff.find(m => m.id === e.target.value);
    setSurgeonId(s?.id || '');
    setSurgeonName(s?.name || '');
  };

  const handleAnesthesiologistChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const s = staff.find(m => m.id === e.target.value);
    setAnesthesiologistId(s?.id || '');
    setAnesthesiologistName(s?.name || '');
  };

  const handleAssistantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const s = staff.find(m => m.id === e.target.value);
    setAssistantId(s?.id || '');
    setAssistantName(s?.name || '');
  };

  const handleSubmit = async () => {
    if (!selectedCustomer || !selectedAnimal || !procedureName || !surgeonName) {
      alert(t('medical:surgeries.fill_required', 'Preencha o paciente, procedimento e cirurgião.'));
      return;
    }
    setLoading(true);
    try {
      const sRef = doc(surgeriesCol(APP_ID));
      const now = new Date().toISOString();
      const surgery: Surgery = {
        id: sRef.id,
        patientId: (selectedAnimal as any).id || selectedAnimal.nome,
        patientName: selectedAnimal.nome,
        species: selectedAnimal.especie || '',
        breed: selectedAnimal.raca,
        sex: selectedAnimal.sexo,
        weight: undefined,
        clientId: selectedCustomer.id,
        clientName: selectedCustomer.nome,
        clientPhone: selectedCustomer.telefone,
        surgeonId,
        surgeonName,
        anesthesiologistId: anesthesiologistId || undefined,
        anesthesiologistName: anesthesiologistName || undefined,
        assistantId: assistantId || undefined,
        assistantName: assistantName || undefined,
        scheduledDate,
        scheduledTime,
        estimatedDuration: Number(estimatedDuration) || 60,
        admission: { ...defaultAdmission, surgicalPurpose: procedureName },
        anesthesia: defaultAnesthesia,
        procedure: { ...defaultProcedure, procedureName },
        postOp: defaultPostOp,
        suppliesUsed: [],
        status: 'scheduled',
        tenantId: APP_ID,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(sRef, surgery);
      onSuccess(sRef.id);
    } catch (err) {
      console.error(err);
      alert(t('medical:surgeries.error_create', 'Erro ao criar cirurgia.'));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-white/10 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">

        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">{t('medical:surgeries.new_surgery', 'Nova Cirurgia')}</h2>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">

          {/* PATIENT SEARCH */}
          {!selectedAnimal ? (
            <div className="space-y-4">
              <label className="text-sm font-bold text-slate-300 block">{t('medical:consultation.search_patient_crm', 'Buscar Paciente no CRM')}</label>
              <div className="relative">
                <Search className="w-5 h-5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder={t('medical:consultation.search_patient_placeholder', 'Nome do cliente ou animal...')}
                  className="w-full bg-slate-900 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-teal-500 transition-colors"
                />
                {searching && <Loader2 className="w-5 h-5 text-teal-500 absolute right-3 top-3 animate-spin" />}
              </div>
              {customers.length > 0 && (
                <div className="bg-slate-900 border border-white/5 rounded-xl overflow-hidden">
                  {customers.map(c => (
                    <div key={c.id} className="p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <p className="font-bold text-white mb-2">{c.nome}</p>
                      {c.animais && c.animais.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {c.animais.map((a, i) => (
                            <button
                              key={i}
                              onClick={() => { setSelectedCustomer(c); setSelectedAnimal(a); }}
                              className="bg-teal-500/10 text-teal-400 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-teal-500 hover:text-white transition-colors"
                            >
                              🐾 {a.nome}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">{t('medical:consultation.no_animals', 'Nenhum animal cadastrado.')}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-teal-400 font-bold text-lg">🐾 {selectedAnimal.nome}</p>
                <p className="text-teal-400/70 text-sm">{t('medical:consultation.owner', 'Responsável:')} {selectedCustomer?.nome}</p>
              </div>
              <button onClick={() => { setSelectedAnimal(null); setSelectedCustomer(null); }} className="text-teal-400 hover:text-teal-300 text-sm font-bold underline">
                {t('common:change', 'Trocar')}
              </button>
            </div>
          )}

          {selectedAnimal && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.procedure', 'Procedimento')} *</label>
                <input
                  type="text"
                  value={procedureName}
                  onChange={e => setProcedureName(e.target.value)}
                  placeholder={t('medical:surgeries.procedure_placeholder', 'Ex: Ovariohisterectomia, Orquiectomia...')}
                  className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-400">{t('common:date', 'Data')} *</label>
                  <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-400">{t('common:time', 'Horário')} *</label>
                  <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.estimated_duration', 'Duração estimada (min)')}</label>
                  <input type="number" value={estimatedDuration} onChange={e => setEstimatedDuration(e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.surgeon', 'Cirurgião')} *</label>
                  <select
                    value={surgeonId}
                    onChange={handleSurgeonChange}
                    className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500"
                  >
                    <option value="">{t('common:select', 'Selecionar...')}</option>
                    {staff.filter(s => s.status === 'Active').map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.anesthesiologist', 'Anestesista')} ({t('common:optional', 'opcional')})</label>
                  <select
                    value={anesthesiologistId}
                    onChange={handleAnesthesiologistChange}
                    className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500"
                  >
                    <option value="">—</option>
                    {staff.filter(s => s.status === 'Active').map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.assistant', 'Auxiliar')} ({t('common:optional', 'opcional')})</label>
                  <select
                    value={assistantId}
                    onChange={handleAssistantChange}
                    className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500"
                  >
                    <option value="">—</option>
                    {staff.filter(s => s.status === 'Active').map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/5 flex items-center justify-end gap-3 shrink-0 bg-slate-900/50">
          <button onClick={onCancel} disabled={loading} className="px-5 py-2.5 rounded-xl font-bold text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            {t('common:cancel', 'Cancelar')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedAnimal || !procedureName}
            className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-teal-500/20 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            {t('medical:surgeries.create_and_open', 'Criar e Abrir Ficha')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewSurgeryModal;
