import { useState } from 'react';
import { PostOperative, SurgeryPrescriptionItem, Surgery } from '../../services/dataService';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  surgery: Surgery;
  onUpdate: (postOp: PostOperative) => void;
  disabled?: boolean;
  onFinalize: () => void;
}

const inputCls = (disabled?: boolean) =>
  `w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none text-sm ${disabled ? 'opacity-60 cursor-not-allowed' : 'focus:border-teal-500'} transition-colors`;

const textareaCls = (disabled?: boolean) =>
  `w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-white outline-none resize-none text-sm ${disabled ? 'opacity-60 cursor-not-allowed' : 'focus:border-teal-500'} transition-colors`;

const emptyMed = (): SurgeryPrescriptionItem => ({
  id: `med_${Date.now()}`,
  medication: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: '',
});

const SurgeryPostOpTab = ({ surgery, onUpdate, disabled, onFinalize }: Props) => {
  const { t } = useTranslation(['medical', 'common']);
  const postOp = surgery.postOp;
  const [newMed, setNewMed] = useState<SurgeryPrescriptionItem>(emptyMed());
  const [showMedForm, setShowMedForm] = useState(false);

  const set = (key: keyof PostOperative, value: any) => onUpdate({ ...postOp, [key]: value });

  const addMed = () => {
    if (!newMed.medication) return;
    onUpdate({ ...postOp, homeMedications: [...(postOp.homeMedications || []), { ...newMed, id: `med_${Date.now()}` }] });
    setNewMed(emptyMed());
    setShowMedForm(false);
  };

  const removeMed = (id: string) => {
    onUpdate({ ...postOp, homeMedications: (postOp.homeMedications || []).filter(m => m.id !== id) });
  };

  return (
    <div className="p-6 space-y-8">

      {/* RESTRIÇÕES */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">── {t('medical:surgeries.restrictions', 'Restrições')} ────────────────────────</h3>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.post_op_restrictions', 'Restrições pós-operatórias')}</label>
          <textarea
            disabled={disabled}
            value={postOp.restrictions || ''}
            onChange={e => set('restrictions', e.target.value)}
            rows={3}
            placeholder={t('medical:surgeries.restrictions_placeholder', 'Ex: Repouso relativo 10 dias, Colar elizabetano 10 dias, Banho após 15 dias...')}
            className={textareaCls(disabled)}
          />
        </div>
      </section>

      {/* MEDICAMENTOS PARA CASA */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">── {t('medical:surgeries.home_medications', 'Medicamentos para Casa')} ────────────</h3>

        {(postOp.homeMedications || []).length > 0 && (
          <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400 bg-slate-900/80 border-b border-white/5">
                <tr>
                  <th className="p-3 font-medium">{t('medical:surgeries.medication', 'Medicamento')}</th>
                  <th className="p-3 font-medium">{t('medical:surgeries.dose', 'Dose')}</th>
                  <th className="p-3 font-medium">{t('medical:surgeries.frequency', 'Frequência')}</th>
                  <th className="p-3 font-medium">{t('medical:surgeries.duration', 'Duração')}</th>
                  {!disabled && <th className="p-3" />}
                </tr>
              </thead>
              <tbody className="text-slate-300 divide-y divide-white/5">
                {(postOp.homeMedications || []).map(med => (
                  <tr key={med.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 font-medium text-white">{med.medication}</td>
                    <td className="p-3">{med.dosage}</td>
                    <td className="p-3">{med.frequency}</td>
                    <td className="p-3">{med.duration}</td>
                    {!disabled && (
                      <td className="p-3 text-right">
                        <button onClick={() => removeMed(med.id)} className="text-slate-500 hover:text-red-400 p-1 rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!disabled && (
          <>
            {showMedForm ? (
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 space-y-4 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">{t('medical:surgeries.medication', 'Medicamento')} *</label>
                    <input type="text" value={newMed.medication} onChange={e => setNewMed(p => ({ ...p, medication: e.target.value }))} placeholder="Amoxicilina 500mg" className={inputCls()} autoFocus />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">{t('medical:surgeries.dose', 'Dose')}</label>
                    <input type="text" value={newMed.dosage} onChange={e => setNewMed(p => ({ ...p, dosage: e.target.value }))} placeholder="1 comprimido" className={inputCls()} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">{t('medical:surgeries.frequency', 'Frequência')}</label>
                    <input type="text" value={newMed.frequency} onChange={e => setNewMed(p => ({ ...p, frequency: e.target.value }))} placeholder="12/12h" className={inputCls()} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">{t('medical:surgeries.duration', 'Duração')}</label>
                    <input type="text" value={newMed.duration} onChange={e => setNewMed(p => ({ ...p, duration: e.target.value }))} placeholder="7 dias" className={inputCls()} />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowMedForm(false)} className="px-4 py-2 text-slate-400 hover:text-white font-bold transition-colors text-sm">{t('common:cancel', 'Cancelar')}</button>
                  <button onClick={addMed} disabled={!newMed.medication} className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-bold transition-all text-sm">
                    {t('common:add', 'Adicionar')}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowMedForm(true)} className="flex items-center gap-2 text-sm font-bold text-teal-400 hover:text-teal-300 transition-colors bg-teal-500/10 px-4 py-2.5 rounded-xl hover:bg-teal-500/20">
                <Plus className="w-4 h-4" /> {t('medical:surgeries.add_medication', 'Adicionar medicamento')}
              </button>
            )}
          </>
        )}
      </section>

      {/* CUIDADOS COM FERIMENTO */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">── {t('medical:surgeries.discharge_instructions', 'Instruções de Alta')} ────────────────</h3>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.general_instructions', 'Instruções gerais / Cuidados com o ferimento')}</label>
          <textarea
            disabled={disabled}
            value={postOp.instructions || ''}
            onChange={e => set('instructions', e.target.value)}
            rows={4}
            placeholder={t('medical:surgeries.instructions_placeholder', 'Instruções de cuidado em casa, sinais de alerta, quando retornar antes do prazo...')}
            className={textareaCls(disabled)}
          />
        </div>
      </section>

      {/* RETORNO */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">── {t('medical:surgeries.return', 'Retorno')} ───────────────────────────</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.return_date', 'Data de Retorno')}</label>
            <input type="date" disabled={disabled} value={postOp.returnDate || ''} onChange={e => set('returnDate', e.target.value)} className={inputCls(disabled)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.return_reason', 'Motivo do Retorno')}</label>
            <input type="text" disabled={disabled} value={postOp.returnInstructions || ''} onChange={e => set('returnInstructions', e.target.value)} placeholder={t('medical:surgeries.return_reason_placeholder', 'Retirada de pontos')} className={inputCls(disabled)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.final_notes', 'Observações finais')}</label>
          <textarea disabled={disabled} value={postOp.notes || ''} onChange={e => set('notes', e.target.value)} rows={2} className={textareaCls(disabled)} />
        </div>
      </section>

      {/* FINALIZAR */}
      {!disabled && (
        <div className="pt-4 border-t border-white/5 flex justify-end">
          <button
            onClick={onFinalize}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold text-base transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            ✅ {t('medical:surgeries.finalize_surgery', 'Finalizar Cirurgia')}
          </button>
        </div>
      )}
    </div>
  );
};

export default SurgeryPostOpTab;
