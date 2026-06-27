import { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
// import { db } from '../../services/firebase';
import { AppUser, APP_ID, Customer, Animal, searchCustomers, hospitalizationsCol } from '../../services/dataService';
import { Search, Loader2, X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  userProfile: AppUser | null;
  onCancel: () => void;
  onSuccess: (id: string) => void;
}

const NewHospitalizationModal = ({ userProfile, onCancel, onSuccess }: Props) => {
  const { t } = useTranslation(['medical', 'common']);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);

  // Form State
  const [sector, setSector] = useState<'hospitalized' | 'isolation' | 'quarantine' | 'triage'>('hospitalized');
  const [box, setBox] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState<'emergency' | 'urgent' | 'little_urgent' | 'not_urgent'>('urgent');
  const [admissionReason, setAdmissionReason] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [expectedDischarge, setExpectedDischarge] = useState('');
  const [weight, setWeight] = useState('');

  // Search logic
  useEffect(() => {
    if (searchTerm.length < 3) {
      setCustomers([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchCustomers(searchTerm);
        setCustomers(results.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSubmit = async () => {
    if (!selectedCustomer || !selectedAnimal || !admissionReason) {
      alert(t('medical:hospitalization.fill_required', 'Selecione o paciente e preencha o motivo de internação.'));
      return;
    }
    
    setLoading(true);
    try {
      const hRef = doc(hospitalizationsCol(APP_ID));
      const now = new Date().toISOString();

      await setDoc(hRef, {
        id: hRef.id,
        patientId: (selectedAnimal as any).id || selectedAnimal.nome, // Falback if id is missing
        patientName: selectedAnimal.nome,
        species: selectedAnimal.especie,
        breed: selectedAnimal.raca,
        sex: selectedAnimal.sexo,
        weight: Number(weight) || 0,
        clientId: selectedCustomer.id,
        clientName: selectedCustomer.nome,
        professionalId: userProfile?.staffId || userProfile?.uid,
        professionalName: userProfile?.nome,
        
        admissionDate: now,
        expectedDischarge: expectedDischarge || null,
        dischargeDate: null,
        sector,
        box,
        urgencyLevel,
        
        admissionReason,
        diagnosis,
        observations: '',
        
        status: sector === 'triage' ? 'triage' : 'active',
        tenantId: APP_ID,
        createdAt: now,
        updatedAt: now
      });

      onSuccess(hRef.id);
    } catch (err) {
      console.error(err);
      alert(t('medical:hospitalization.error_hospitalize', 'Erro ao internar paciente.'));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-white/10 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-white">{t('medical:hospitalization.hospitalize_patient', 'Internar Paciente')}</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* SELEÇÃO DO PACIENTE */}
          {!selectedAnimal ? (
            <div className="space-y-4">
              <label className="text-sm font-bold text-slate-300 block">{t('medical:consultation.search_patient_crm', 'Buscar Cliente/Paciente no CRM')}</label>
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
                              onClick={() => {
                                setSelectedCustomer(c);
                                setSelectedAnimal(a);
                              }}
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
              <button onClick={() => setSelectedAnimal(null)} className="text-teal-400 hover:text-teal-300 text-sm font-bold underline">
                {t('common:change', 'Trocar')}
              </button>
            </div>
          )}

          {/* FORMULÁRIO DE INTERNAÇÃO */}
          {selectedAnimal && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-400">{t('medical:hospitalization.sector', 'Setor')}</label>
                  <select value={sector} onChange={e => setSector(e.target.value as any)} className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500">
                    <option value="hospitalized">🏥 {t('medical:hospitalization.sectors.general', 'Internação Geral')}</option>
                    <option value="isolation">🔴 {t('medical:hospitalization.sectors.isolation', 'Isolamento')}</option>
                    <option value="quarantine">🟡 {t('medical:hospitalization.sectors.quarantine', 'Quarentena')}</option>
                    <option value="triage">🔵 {t('medical:hospitalization.sectors.triage', 'Triagem')}</option>
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-400">{t('medical:hospitalization.urgency_level', 'Nível de urgência')}</label>
                  <select value={urgencyLevel} onChange={e => setUrgencyLevel(e.target.value as any)} className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500">
                    <option value="emergency">🚨 {t('medical:hospitalization.urgency.emergency', 'Emergência')}</option>
                    <option value="urgent">🔴 {t('medical:hospitalization.urgency.urgent', 'Urgente')}</option>
                    <option value="little_urgent">🟡 {t('medical:hospitalization.urgency.little_urgent', 'Pouco Urgente')}</option>
                    <option value="not_urgent">⚪ {t('medical:hospitalization.urgency.not_urgent', 'Não Urgente')}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-400">{t('medical:hospitalization.box_optional', 'Baia/Box (opcional)')}</label>
                  <input type="text" value={box} onChange={e => setBox(e.target.value)} placeholder="Ex: Box 03" className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-400">{t('medical:hospitalization.current_weight', 'Peso atual (kg)')}</label>
                  <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="0.0" className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-400">{t('medical:hospitalization.admission_reason', 'Motivo de Internação')} *</label>
                <textarea value={admissionReason} onChange={e => setAdmissionReason(e.target.value)} placeholder={t('medical:hospitalization.admission_reason_placeholder', 'Descreva brevemente por que o animal está sendo internado...')} className="w-full h-20 bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500 resize-none" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-400">{t('medical:hospitalization.initial_diagnosis', 'Diagnóstico Inicial / Suspeita')}</label>
                <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} className="w-full h-16 bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500 resize-none" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-400">{t('medical:hospitalization.expected_discharge', 'Previsão de Alta (Opcional)')}</label>
                <input type="date" value={expectedDischarge} onChange={e => setExpectedDischarge(e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500" />
              </div>

            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/5 flex items-center justify-end gap-3 shrink-0 bg-slate-900/50">
          <button 
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl font-bold text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            {t('common:cancel', 'Cancelar')}
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loading || !selectedAnimal || !admissionReason}
            className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-teal-500/20 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            {t('medical:hospitalization.confirm_hospitalization', 'Confirmar Internação')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewHospitalizationModal;
