import { useState, useEffect } from 'react';
import { query, where, getDocs, onSnapshot } from 'firebase/firestore';
// import { db } from '../../services/firebase';
import { AppUser, APP_ID, Hospitalization, ScheduledDose, hospitalizationsCol, scheduledDosesCol } from '../../services/dataService';
import { Loader2, ChevronLeft, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// import AdministerDoseModal from '../../components/medical/AdministerDoseModal';

interface Props {
  userProfile: AppUser | null;
}

const getStatusColor = (status: string, expectedTime: string, expectedDate: string) => {
  const now = new Date();
  const scheduled = new Date(`${expectedDate}T${expectedTime}`);

  if (status === 'administered') return 'bg-teal-500 text-white';
  if (status === 'skipped') return 'bg-slate-300 text-slate-700';
  
  if (status === 'pending' && now > scheduled) return 'bg-red-100 text-red-700 border border-red-200'; // overdue
  
  return 'bg-teal-100 text-teal-700 border border-teal-200'; // future pending
};

// @ts-ignore
const ExecutionMap = ({ userProfile }: Props) => {
  const { t } = useTranslation(['medical', 'common']);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Hospitalization[]>([]);
  const [doses, setDoses] = useState<ScheduledDose[]>([]);
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [selectedDose, setSelectedDose] = useState<ScheduledDose | null>(null);
  // const [administeringDose, setAdministeringDose] = useState<ScheduledDose | null>(null);

  // 1. Fetch active patients (or patients that were active today)
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const q = query(hospitalizationsCol(APP_ID), where('status', 'in', ['active', 'triage']));
        const snap = await getDocs(q);
        setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Hospitalization)));
      } catch (err) {
        console.error(err);
      }
    };
    fetchPatients();
  }, []);

  // 2. Listen to doses for the selected date
  useEffect(() => {
    setLoading(true);
    const q = query(
      scheduledDosesCol(APP_ID),
      where('scheduledDate', '==', selectedDate)
    );

    const unsub = onSnapshot(q, snap => {
      setDoses(snap.docs.map(d => ({ id: d.id, ...d.data() } as ScheduledDose)));
      setLoading(false);
    });
    
    return () => unsub();
  }, [selectedDate]);

  const changeDate = (days: number) => {
    const d = new Date(`${selectedDate}T12:00:00`);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Group doses by patient and then by hour
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

  if (loading && doses.length === 0) return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 text-teal-500 animate-spin" /></div>;

  return (
    <div className="h-full flex flex-col space-y-6">
      
      {/* FILTER HEADER */}
      <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-4">
          <button onClick={() => changeDate(-1)} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center min-w-[150px]">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">{t('medical:map.title', 'Mapa de Execução')}</p>
            <p className="text-white font-bold text-lg">{selectedDate.split('-').reverse().join('/')}</p>
          </div>
          <button onClick={() => changeDate(1)} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors text-white">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-4 text-xs font-bold text-slate-400 bg-slate-800 px-4 py-2 rounded-xl">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-teal-500" /> {t('medical:map.administered', 'Administrado')}</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-teal-100 border border-teal-200" /> {t('medical:map.pending', 'Pendente')}</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-100 border border-red-200" /> {t('medical:map.overdue', 'Atrasado')}</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-300" /> {t('medical:map.skipped', 'Suspenso')}</div>
        </div>
      </div>

      {/* MATRIX TABLE */}
      <div className="flex-1 overflow-auto bg-slate-900/50 rounded-2xl border border-white/5 relative">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-slate-900 shadow-md z-10">
            <tr>
              <th className="p-4 border-b border-r border-white/5 min-w-[200px] w-64 text-sm font-bold text-slate-400 bg-slate-900">
                {t('medical:map.patient_sector', 'Paciente / Setor')}
              </th>
              {hours.map(h => (
                <th key={h} className="p-2 border-b border-r border-white/5 min-w-[50px] text-center text-xs font-bold text-slate-500 bg-slate-900">
                  {h}h
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {patients.length === 0 ? (
              <tr>
                <td colSpan={25} className="p-8 text-center text-slate-500">{t('medical:map.no_patients', 'Nenhum paciente internado no momento.')}</td>
              </tr>
            ) : (
              patients.map(p => {
                const patientDoses = doses.filter(d => d.patientId === p.id);
                // If patient has no doses today and is not hospitalized today, maybe hide? 
                // We show all active patients.
                
                return (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-4 border-b border-r border-white/5 bg-slate-800/50 group-hover:bg-transparent transition-colors">
                      <p className="font-bold text-white text-sm truncate" title={p.patientName}>{p.patientName}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {p.sector === 'hospitalized' ? 'Internação Geral' : p.sector === 'isolation' ? 'Isolamento' : p.sector === 'quarantine' ? 'Quarentena' : 'Triagem'} 
                        {p.box ? ` • ${p.box}` : ''}
                      </p>
                    </td>
                    
                    {hours.map(h => {
                      const hourDoses = patientDoses.filter(d => d.scheduledTime.startsWith(h));
                      
                      return (
                        <td key={h} className="p-1 border-b border-r border-white/5 align-middle relative group/cell">
                          {hourDoses.length > 0 && (
                            <div className="flex flex-col gap-1 items-center justify-center">
                              {hourDoses.map(dose => (
                                <button 
                                  key={dose.id}
                                  onClick={() => setSelectedDose(dose)}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm hover:scale-110 transition-transform ${getStatusColor(dose.status, dose.scheduledTime, dose.scheduledDate)}`}
                                >
                                  {hourDoses.length > 1 ? hourDoses.length : ''}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* QUICK ACTIONS MODAL FOR A DOSE */}
      {selectedDose && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-5 border-b border-white/5 flex items-start justify-between bg-teal-500/10">
              <div>
                <p className="text-teal-400 font-bold">{selectedDose.patientName}</p>
                <p className="text-teal-400/70 text-xs mt-0.5">{selectedDose.scheduledTime}h • {selectedDose.scheduledDate.split('-').reverse().join('/')}</p>
              </div>
              <button onClick={() => setSelectedDose(null)} className="text-teal-400/50 hover:text-teal-400"><Clock className="w-5 h-5"/></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-lg font-bold text-white">{selectedDose.productName}</h4>
                <p className="text-sm text-slate-400">{selectedDose.dosage} • Via {selectedDose.route}</p>
              </div>

              <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className={`font-bold ${selectedDose.status === 'administered' ? 'text-emerald-500' : selectedDose.status === 'skipped' ? 'text-slate-500' : 'text-amber-500'}`}>
                    {selectedDose.status.toUpperCase()}
                  </span>
                </div>
                {selectedDose.administeredAt && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Administrado às</span>
                      <span className="text-white font-mono">{new Date(selectedDose.administeredAt).toTimeString().substring(0,5)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Responsável</span>
                      <span className="text-white truncate max-w-[150px]">{selectedDose.administeredBy}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-white/5 bg-slate-900/50 flex gap-2">
              <button onClick={() => setSelectedDose(null)} className="flex-1 py-2.5 rounded-xl font-bold text-slate-400 hover:bg-white/5 hover:text-white transition-colors text-sm">{t('common:close', 'Fechar')}</button>
              {selectedDose.status !== 'administered' && selectedDose.status !== 'skipped' && (
                <button 
                  onClick={() => {
                    // setAdministeringDose(selectedDose);
                    // setSelectedDose(null);
                    alert('Utilize a Ficha do Paciente para administrar ou suspender doses com baixa de estoque.');
                  }}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 text-sm"
                >
                  <CheckCircle2 className="w-4 h-4" /> {t('medical:map.administer', 'Administrar')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* {administeringDose && (
        <AdministerDoseModal 
          dose={administeringDose}
          userProfile={userProfile}
          onCancel={() => setAdministeringDose(null)}
          onSuccess={() => setAdministeringDose(null)}
        />
      )} */}

    </div>
  );
};

export default ExecutionMap;
