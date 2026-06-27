import { useState, useEffect } from 'react';
import { query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
// import { db } from '../../services/firebase';
import { AppUser, APP_ID, Hospitalization, Prescription, ScheduledDose, prescriptionsCol, scheduledDosesCol } from '../../services/dataService';
import { Plus, Check, Loader2, Syringe, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import NewPrescriptionModal from './NewPrescriptionModal';
import AdministerDoseModal from './AdministerDoseModal';

interface Props {
  hospitalization: Hospitalization;
  userProfile: AppUser | null;
}

const HospitalizationPrescriptions = ({ hospitalization, userProfile }: Props) => {
  const { t } = useTranslation(['medical', 'common']);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [doses, setDoses] = useState<ScheduledDose[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNew, setShowNew] = useState(false);
  const [administerDose, setAdministerDose] = useState<ScheduledDose | null>(null);

  useEffect(() => {
    // 1. Listen to prescriptions
    const qP = query(prescriptionsCol(APP_ID), where('hospitalizationId', '==', hospitalization.id));
    const unsubP = onSnapshot(qP, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Prescription));
      setPrescriptions(list);
    });

    // 2. Listen to doses
    const qD = query(scheduledDosesCol(APP_ID), where('hospitalizationId', '==', hospitalization.id));
    const unsubD = onSnapshot(qD, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ScheduledDose));
      // Sort doses by date and time
      list.sort((a, b) => {
        const dtA = new Date(`${a.scheduledDate}T${a.scheduledTime}`);
        const dtB = new Date(`${b.scheduledDate}T${b.scheduledTime}`);
        return dtA.getTime() - dtB.getTime();
      });
      setDoses(list);
      setLoading(false);
    });

    return () => { unsubP(); unsubD(); };
  }, [hospitalization.id]);

  const handleSuspend = async (p: Prescription) => {
    if (!confirm(t('medical:hospitalization.confirm_suspend_prescription', 'Tem certeza que deseja suspender esta prescrição? Doses futuras serão canceladas.'))) return;
    
    try {
      // Mark prescription as suspended
      const pRef = doc(prescriptionsCol(APP_ID), p.id);
      await updateDoc(pRef, { status: 'suspended' });
      
      // Mark future pending doses as skipped
      const pendingDoses = doses.filter(d => d.prescriptionId === p.id && d.status === 'pending');
      for (const d of pendingDoses) {
        const dRef = doc(scheduledDosesCol(APP_ID), d.id);
        await updateDoc(dRef, { status: 'skipped', skippedReason: t('medical:hospitalization.suspended_reason', 'Prescrição suspensa') });
      }
    } catch (err) {
      console.error(err);
      alert(t('medical:hospitalization.error_suspend_prescription', 'Erro ao suspender prescrição.'));
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-teal-500" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">{t('medical:hospitalization.therapeutic_plan', 'Quadro Terapêutico')}</h3>
        <button onClick={() => setShowNew(true)} className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-teal-500/20">
          <Plus className="w-4 h-4" /> {t('medical:hospitalization.new_prescription', 'Nova Prescrição')}
        </button>
      </div>

      {prescriptions.length === 0 ? (
        <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-12 text-center">
          <Syringe className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">{t('medical:hospitalization.no_active_prescriptions', 'Nenhuma prescrição ativa.')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {prescriptions.map(p => {
            const myDoses = doses.filter(d => d.prescriptionId === p.id);
            const pendingDoses = myDoses.filter(d => d.status === 'pending' || d.status === 'overdue');
            const nextDose = pendingDoses.length > 0 ? pendingDoses[0] : null;

            return (
              <div key={p.id} className={`bg-slate-900/50 border ${p.status === 'suspended' ? 'border-red-500/20 opacity-60' : 'border-white/5'} rounded-2xl p-5`}>
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  
                  <div>
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                      {p.productName} <span className="text-sm font-medium text-slate-400">— {p.dosage}</span>
                    </h4>
                    <p className="text-sm text-slate-400 mt-1">{t('medical:hospitalization.route_short', 'Via')}: <strong className="text-slate-300">{p.route}</strong> • {t('medical:hospitalization.freq_short', 'Freq')}: <strong className="text-slate-300">{p.frequency}</strong> • {t('medical:hospitalization.calculated_dose', 'Dose calculada')}: {p.calculatedDose || '-'}</p>
                    {p.instructions && <p className="text-sm text-amber-400/80 mt-2 bg-amber-500/10 px-3 py-1.5 rounded-lg inline-block">{p.instructions}</p>}
                  </div>

                  <div className="flex flex-col items-start md:items-end gap-3 min-w-[200px]">
                    {p.status === 'suspended' ? (
                      <span className="text-red-400 text-sm font-bold bg-red-500/10 px-3 py-1 rounded-lg">{t('common:status.suspended', 'Suspensa')}</span>
                    ) : nextDose ? (
                      <>
                        <div className="text-right">
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">{t('medical:hospitalization.next_dose', 'Próxima dose')}</p>
                          <p className={`text-sm font-bold flex items-center gap-1.5 ${nextDose.status === 'overdue' ? 'text-red-400' : 'text-amber-400'}`}>
                            <Clock className="w-4 h-4" /> {nextDose.scheduledDate.split('-').reverse().join('/')} {t('common:at', 'às')} {nextDose.scheduledTime}
                          </p>
                        </div>
                        <div className="flex gap-2 w-full">
                          <button onClick={() => handleSuspend(p)} className="flex-1 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-300 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors">
                            {t('common:suspend', 'Suspender')}
                          </button>
                          <button onClick={() => setAdministerDose(nextDose)} className="flex-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors">
                            {t('medical:hospitalization.administer', 'Administrar')}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-emerald-400 text-sm font-bold bg-emerald-500/10 px-3 py-1.5 rounded-lg flex items-center gap-2">
                        <Check className="w-4 h-4" /> {t('common:status.completed', 'Concluída')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar of doses */}
                <div className="mt-4 flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                  {myDoses.map((d) => (
                    <div 
                      key={d.id} 
                      title={`${d.scheduledDate} ${d.scheduledTime} - ${d.status}`}
                      className={`w-8 h-2 shrink-0 rounded-full transition-all ${
                        d.status === 'administered' ? 'bg-emerald-500' : 
                        d.status === 'overdue' ? 'bg-red-500' : 
                        d.status === 'skipped' ? 'bg-slate-700' : 
                        'bg-slate-700/50'
                      }`} 
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNew && (
        <NewPrescriptionModal 
          hospitalization={hospitalization}
          userProfile={userProfile}
          onCancel={() => setShowNew(false)}
          onSuccess={() => setShowNew(false)}
        />
      )}

      {administerDose && (
        <AdministerDoseModal
          dose={administerDose}
          userProfile={userProfile}
          onCancel={() => setAdministerDose(null)}
          onSuccess={() => setAdministerDose(null)}
        />
      )}
    </div>
  );
};

export default HospitalizationPrescriptions;
