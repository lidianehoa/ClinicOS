import { useState } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { APP_ID, Hospitalization, hospitalizationsCol } from '../../services/dataService';
import { Loader2, X, Check, HeartPulse, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  hospitalization: Hospitalization;
  onCancel: () => void;
  onSuccess: () => void;
}

const DischargeModal = ({ hospitalization, onCancel, onSuccess }: Props) => {
  const { t } = useTranslation(['medical', 'common']);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('clinical_cure'); // clinical_cure, request, refusal, death, transfer
  const [instructions, setInstructions] = useState('');

  const handleDischarge = async () => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const nowStr = new Date().toISOString();

      // 1. Marcar como discharged
      const hRef = doc(hospitalizationsCol(APP_ID), hospitalization.id);
      batch.update(hRef, {
        status: 'discharged',
        dischargeDate: nowStr,
        updatedAt: nowStr
      });

      // 2. Criar evento na timeline do paciente
      // Although TimelineEvent is not a standalone collection, in this system events are aggregated from records
      // But actually, we don't need a separate collection for timeline since PatientTimeline parses hospitalizations!
      // PatientTimeline already looks for hospitalizations with status = 'discharged' as completed events. 
      // We are good just by updating the status!

      await batch.commit();
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Erro ao processar alta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95">
        
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-emerald-500/10">
          <h2 className="text-xl font-bold text-emerald-500 flex items-center gap-2">
            <HeartPulse className="w-5 h-5" /> {t('medical:hospitalization.discharge_title', 'Conceder Alta')} — {hospitalization.patientName}
          </h2>
          <button onClick={onCancel} className="text-emerald-500/50 hover:text-emerald-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-300">{t('medical:hospitalization.discharge_reason', 'Motivo da alta')}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'clinical_cure', label: t('medical:hospitalization.reason_cure', 'Cura Clínica'), color: 'emerald' },
                { id: 'request', label: t('medical:hospitalization.reason_request', 'A pedido do responsável'), color: 'sky' },
                { id: 'refusal', label: t('medical:hospitalization.reason_refusal', 'Recusa de tratamento'), color: 'amber' },
                { id: 'transfer', label: t('medical:hospitalization.reason_transfer', 'Transferência'), color: 'purple' },
                { id: 'death', label: t('medical:hospitalization.reason_death', 'Óbito'), color: 'red' },
              ].map(opt => (
                <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${reason === opt.id ? `bg-${opt.color}-500/10 border-${opt.color}-500 text-${opt.color}-400 font-bold` : 'bg-slate-900/50 border-white/5 text-slate-400 hover:bg-white/5'}`}>
                  <input type="radio" name="reason" value={opt.id} checked={reason === opt.id} onChange={() => setReason(opt.id)} className="hidden" />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${reason === opt.id ? `border-${opt.color}-500` : 'border-slate-500'}`}>
                    {reason === opt.id && <div className={`w-2 h-2 rounded-full bg-${opt.color}-500`} />}
                  </div>
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-300 block mb-1">{t('medical:hospitalization.discharge_instructions', 'Instruções de alta para casa')}</label>
            <textarea 
              value={instructions} 
              onChange={e => setInstructions(e.target.value)} 
              placeholder={t('medical:hospitalization.instructions_placeholder', 'Descreva cuidados, dieta, retornos...')}
              className="w-full h-24 bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 resize-none text-sm"
            />
          </div>

          {(reason === 'refusal' || reason === 'death') && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3">
              <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <p className="text-red-400 font-bold text-sm">Atenção Crítica</p>
                <p className="text-red-400/80 text-xs mt-1">Este motivo de alta pode gerar necessidade de assinatura de termo de responsabilidade pelo cliente. O status de internação será encerrado imediatamente.</p>
              </div>
            </div>
          )}

        </div>

        <div className="p-6 border-t border-white/5 flex gap-3 bg-slate-900/50">
          <button onClick={onCancel} disabled={loading} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            {t('common:cancel', 'Cancelar')}
          </button>
          <button onClick={handleDischarge} disabled={loading} className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />} {t('medical:hospitalization.confirm_discharge', 'Confirmar Alta')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DischargeModal;
