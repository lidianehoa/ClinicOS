import { Surgery, SurgicalAdmission } from '../../services/dataService';
import { useTranslation } from 'react-i18next';

interface Props {
  surgery: Surgery;
  onUpdate: (admission: SurgicalAdmission) => void;
  disabled?: boolean;
}

const getAsaLabels = (t: any): Record<string, string> => ({
  I: t('medical:surgeries.asa_I', 'I — Paciente saudável'),
  II: t('medical:surgeries.asa_II', 'II — Doença sistêmica leve'),
  III: t('medical:surgeries.asa_III', 'III — Doença sistêmica grave'),
  IV: t('medical:surgeries.asa_IV', 'IV — Risco de vida imediato'),
  V: t('medical:surgeries.asa_V', 'V — Moribundo'),
});

const inputCls = (disabled?: boolean) =>
  `w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none ${disabled ? 'opacity-60 cursor-not-allowed' : 'focus:border-teal-500'} transition-colors`;

const textareaCls = (disabled?: boolean) =>
  `w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-white outline-none resize-none ${disabled ? 'opacity-60 cursor-not-allowed' : 'focus:border-teal-500'} transition-colors`;

const SurgeryAdmissionTab = ({ surgery, onUpdate, disabled }: Props) => {
  const { t } = useTranslation(['medical', 'common']);
  const adm = surgery.admission;
  const ASA_LABELS = getAsaLabels(t);

  const set = (key: keyof SurgicalAdmission, value: any) => {
    onUpdate({ ...adm, [key]: value });
  };

  return (
    <div className="p-6 space-y-8">

      {/* OBJETIVO */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">── {t('medical:surgeries.surgery_objective', 'Objetivo da Cirurgia')} ─────────────</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.procedure_reason', 'Procedimento / Motivo')} *</label>
            <input
              type="text"
              disabled={disabled}
              value={adm.surgicalPurpose || ''}
              onChange={e => set('surgicalPurpose', e.target.value)}
              placeholder={t('medical:surgeries.procedure_placeholder', 'Ex: Castração, Tumor mamário...')}
              className={inputCls(disabled)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.clinical_indication', 'Indicação Clínica')} *</label>
            <input
              type="text"
              disabled={disabled}
              value={adm.clinicalIndication || ''}
              onChange={e => set('clinicalIndication', e.target.value)}
              placeholder={t('medical:surgeries.clinical_indication_placeholder', 'Justificativa clínica...')}
              className={inputCls(disabled)}
            />
          </div>
        </div>
      </section>

      {/* PRÉ-ANESTÉSICA */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">── {t('medical:surgeries.pre_anesthetic_eval', 'Avaliação Pré-anestésica')} ──────────</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.asa_classification', 'Classificação ASA')}</label>
            <select
              disabled={disabled}
              value={adm.asaClassification || 'I'}
              onChange={e => set('asaClassification', e.target.value as any)}
              className={inputCls(disabled)}
            >
              {Object.entries(ASA_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.fasting_hours', 'Horas de Jejum')}</label>
            <input
              type="number"
              disabled={disabled}
              value={adm.fastingHours || ''}
              onChange={e => set('fastingHours', Number(e.target.value))}
              placeholder="8"
              className={inputCls(disabled)}
            />
          </div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer group">
          <div
            onClick={() => !disabled && set('fastingConfirmed', !adm.fastingConfirmed)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${adm.fastingConfirmed ? 'bg-teal-500 border-teal-500' : 'border-slate-600 group-hover:border-teal-400'}`}
          >
            {adm.fastingConfirmed && <span className="text-white text-xs font-bold">✓</span>}
          </div>
          <span className="text-sm text-slate-300">{t('medical:surgeries.fasting_confirmed', 'Jejum confirmado pelo responsável')}</span>
        </label>
      </section>

      {/* EXAMES PRÉ-OPERATÓRIOS */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">── {t('medical:surgeries.pre_op_exams', 'Exames Pré-operatórios')} ────────────</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.exams_performed', 'Exames Realizados')}</label>
            <input
              type="text"
              disabled={disabled}
              value={adm.preOpExams || ''}
              onChange={e => set('preOpExams', e.target.value)}
              placeholder={t('medical:surgeries.exams_placeholder', 'Hemograma, bioquímica...')}
              className={inputCls(disabled)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.results_observations', 'Resultados / Observações')}</label>
            <input
              type="text"
              disabled={disabled}
              value={adm.examsResult || ''}
              onChange={e => set('examsResult', e.target.value)}
              placeholder={t('medical:surgeries.results_placeholder', 'Dentro da normalidade...')}
              className={inputCls(disabled)}
            />
          </div>
        </div>
      </section>

      {/* SINAIS VITAIS */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">── {t('medical:surgeries.vital_signs_admission', 'Sinais Vitais na Admissão')} ─────────</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: t('medical:surgeries.weight_kg', 'Peso (kg)'), key: 'admissionWeight' as const, step: '0.1', placeholder: '35.0' },
            { label: t('medical:surgeries.temp_c', 'Temp (°C)'), key: 'admissionTemperature' as const, step: '0.1', placeholder: '38.5' },
            { label: t('medical:surgeries.hr_bpm', 'FC (bpm)'), key: 'admissionHeartRate' as const, step: '1', placeholder: '72' },
            { label: t('medical:surgeries.rr_rpm', 'FR (rpm)'), key: 'admissionRespiratoryRate' as const, step: '1', placeholder: '18' },
            { label: t('medical:surgeries.spo2', 'SpO2 (%)'), key: 'admissionSpO2' as const, step: '1', placeholder: '98' },
          ].map(f => (
            <div key={f.key} className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500">{f.label}</label>
              <input
                type="number"
                step={f.step}
                disabled={disabled}
                value={(adm[f.key] as number) || ''}
                onChange={e => set(f.key, Number(e.target.value))}
                placeholder={f.placeholder}
                className={inputCls(disabled)}
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500">{t('medical:surgeries.bp_mmhg', 'PA (mmHg)')}</label>
            <input
              type="text"
              disabled={disabled}
              value={adm.admissionPressure || ''}
              onChange={e => set('admissionPressure', e.target.value)}
              placeholder="120/80"
              className={inputCls(disabled)}
            />
          </div>
        </div>
      </section>

      {/* HISTÓRICO */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">── {t('medical:surgeries.relevant_history', 'Histórico Relevante')} ───────────────</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.allergies', 'Alergias')}</label>
            <textarea disabled={disabled} value={adm.allergies || ''} onChange={e => set('allergies', e.target.value)} rows={2} className={textareaCls(disabled)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.current_meds', 'Medicamentos em uso')}</label>
            <textarea disabled={disabled} value={adm.currentMedications || ''} onChange={e => set('currentMedications', e.target.value)} rows={2} className={textareaCls(disabled)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.previous_surgeries', 'Cirurgias anteriores')}</label>
            <textarea disabled={disabled} value={adm.previousSurgeries || ''} onChange={e => set('previousSurgeries', e.target.value)} rows={2} className={textareaCls(disabled)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.relevant_obs', 'Observações relevantes')}</label>
            <textarea disabled={disabled} value={adm.relevantHistory || ''} onChange={e => set('relevantHistory', e.target.value)} rows={2} className={textareaCls(disabled)} />
          </div>
        </div>
      </section>

      {/* CONSENTIMENTO */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">── {t('medical:surgeries.informed_consent', 'Consentimento Informado')} ───────────</h3>
        <label className="flex items-center gap-3 cursor-pointer group">
          <div
            onClick={() => !disabled && set('consentSigned', !adm.consentSigned)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${adm.consentSigned ? 'bg-teal-500 border-teal-500' : 'border-slate-600 group-hover:border-teal-400'}`}
          >
            {adm.consentSigned && <span className="text-white text-xs font-bold">✓</span>}
          </div>
          <span className="text-sm text-slate-300 font-medium">{t('medical:surgeries.term_signed', 'Termo assinado pelo responsável')}</span>
        </label>
        {adm.consentSigned && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.signed_by', 'Assinado por')}</label>
              <input
                type="text"
                disabled={disabled}
                value={adm.consentSignedBy || ''}
                onChange={e => set('consentSignedBy', e.target.value)}
                placeholder={t('medical:surgeries.owner_name_placeholder', 'Nome do responsável')}
                className={inputCls(disabled)}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default SurgeryAdmissionTab;
