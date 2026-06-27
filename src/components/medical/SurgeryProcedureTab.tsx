import { SurgicalProcedure, Surgery } from '../../services/dataService';
import { useTranslation } from 'react-i18next';

interface Props {
  surgery: Surgery;
  onUpdate: (procedure: SurgicalProcedure) => void;
  disabled?: boolean;
}

const inputCls = (disabled?: boolean) =>
  `w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none text-sm ${disabled ? 'opacity-60 cursor-not-allowed' : 'focus:border-teal-500'} transition-colors`;

const textareaCls = (disabled?: boolean) =>
  `w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-white outline-none resize-none text-sm ${disabled ? 'opacity-60 cursor-not-allowed' : 'focus:border-teal-500'} transition-colors`;

const SurgeryProcedureTab = ({ surgery, onUpdate, disabled }: Props) => {
  const { t } = useTranslation(['medical', 'common']);
  const proc = surgery.procedure;

  const set = (key: keyof SurgicalProcedure, value: any) => {
    onUpdate({ ...proc, [key]: value });
  };

  // Calculate duration from start/end times
  const calcDuration = (start: string, end: string): number | undefined => {
    if (!start || !end) return undefined;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? diff : undefined;
  };

  const handleTimeChange = (key: 'startTime' | 'endTime', value: string) => {
    const newProc = { ...proc, [key]: value };
    const start = key === 'startTime' ? value : proc.startTime;
    const end = key === 'endTime' ? value : proc.endTime;
    if (start && end) {
      newProc.duration = calcDuration(start, end);
    }
    onUpdate(newProc);
  };

  return (
    <div className="p-6 space-y-8">

      {/* TEMPOS CIRÚRGICOS */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">── {t('medical:surgeries.surgical_times', 'Tempos Cirúrgicos')} ─────────────────</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.start', 'Início')}</label>
            <input
              type="time"
              disabled={disabled}
              value={proc.startTime || ''}
              onChange={e => handleTimeChange('startTime', e.target.value)}
              className={inputCls(disabled)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.end', 'Término')}</label>
            <input
              type="time"
              disabled={disabled}
              value={proc.endTime || ''}
              onChange={e => handleTimeChange('endTime', e.target.value)}
              className={inputCls(disabled)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.duration_min', 'Duração (min)')}</label>
            <div className={`w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-white text-sm font-mono ${proc.duration ? 'text-teal-400' : 'text-slate-600'}`}>
              {proc.duration ? `${proc.duration} ${t('medical:surgeries.minutes', 'minutos')}` : '—'}
            </div>
          </div>
        </div>
      </section>

      {/* PROCEDIMENTO */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">── {t('medical:surgeries.procedure_performed', 'Procedimento Realizado')} ────────────</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.procedure_name', 'Nome do Procedimento')} *</label>
            <input
              type="text"
              disabled={disabled}
              value={proc.procedureName || ''}
              onChange={e => set('procedureName', e.target.value)}
              placeholder={t('medical:surgeries.procedure_placeholder', 'Ovariohisterectomia bilateral eletiva')}
              className={inputCls(disabled)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.technique_used', 'Técnica utilizada')}</label>
            <input
              type="text"
              disabled={disabled}
              value={proc.technique || ''}
              onChange={e => set('technique', e.target.value)}
              placeholder={t('medical:surgeries.technique_placeholder', 'Técnica convencional...')}
              className={inputCls(disabled)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.proc_desc', 'Descrição detalhada do procedimento')} *</label>
          <p className="text-xs text-slate-500 mb-1">{t('medical:surgeries.proc_desc_hint', 'Principal campo de documentação cirúrgica')}</p>
          <textarea
            disabled={disabled}
            value={proc.procedureDescription || ''}
            onChange={e => set('procedureDescription', e.target.value)}
            rows={6}
            placeholder={t('medical:surgeries.proc_desc_placeholder', 'Descreva detalhadamente o que foi realizado durante o procedimento...')}
            className={textareaCls(disabled)}
          />
        </div>
      </section>

      {/* ACHADOS E INTERCORRÊNCIAS */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">── {t('medical:surgeries.findings_title', 'Achados e Intercorrências')} ─────────</h3>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.findings', 'Achados intraoperatórios')}</label>
          <textarea
            disabled={disabled}
            value={proc.findings || ''}
            onChange={e => set('findings', e.target.value)}
            rows={3}
            placeholder={t('medical:surgeries.findings_placeholder', 'Descreva os achados...')}
            className={textareaCls(disabled)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.complications', 'Intercorrências / Complicações')}</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => !disabled && set('complications', undefined)}
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${!proc.complications ? 'border-teal-500 bg-teal-500' : 'border-slate-600 hover:border-teal-400'}`}
              >
                {!proc.complications && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <span className="text-sm text-slate-300">{t('common:no', 'Não')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => !disabled && set('complications', proc.complications || '')}
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${proc.complications !== undefined ? 'border-teal-500 bg-teal-500' : 'border-slate-600 hover:border-teal-400'}`}
              >
                {proc.complications !== undefined && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <span className="text-sm text-slate-300">{t('common:yes', 'Sim')}</span>
            </label>
          </div>
          {proc.complications !== undefined && (
            <textarea
              disabled={disabled}
              value={proc.complications || ''}
              onChange={e => set('complications', e.target.value)}
              rows={2}
              placeholder={t('medical:surgeries.complications_placeholder', 'Descreva as intercorrências...')}
              className={textareaCls(disabled) + ' animate-in fade-in'}
            />
          )}
        </div>
      </section>

      {/* SÍNTESE E HEMOSTASIA */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">── {t('medical:surgeries.synthesis_title', 'Síntese e Hemostasia')} ──────────────</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.synthesis', 'Síntese / Fechamento')}</label>
            <textarea disabled={disabled} value={proc.synthesis || ''} onChange={e => set('synthesis', e.target.value)} rows={2} placeholder={t('medical:surgeries.synthesis_placeholder', 'Fio Vicryl 2-0, Nylon 3-0...')} className={textareaCls(disabled)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.hemostasis', 'Hemostasia')}</label>
            <textarea disabled={disabled} value={proc.hemostasis || ''} onChange={e => set('hemostasis', e.target.value)} rows={2} className={textareaCls(disabled)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.drainage', 'Drenagem')}</label>
            <input type="text" disabled={disabled} value={proc.drainage || ''} onChange={e => set('drainage', e.target.value)} className={inputCls(disabled)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.dressing', 'Curativo')}</label>
            <input type="text" disabled={disabled} value={proc.dressing || ''} onChange={e => set('dressing', e.target.value)} placeholder={t('medical:surgeries.dressing_placeholder', 'Curativo seco, bandagem compressiva...')} className={inputCls(disabled)} />
          </div>
        </div>
      </section>

      {/* BIÓPSIA */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">── {t('medical:surgeries.pathology', 'Material Enviado para Patologia')} ───</h3>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={() => !disabled && set('biopsySent', false)} className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${!proc.biopsySent ? 'border-teal-500 bg-teal-500' : 'border-slate-600 hover:border-teal-400'}`}>
              {!proc.biopsySent && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <span className="text-sm text-slate-300">{t('common:no', 'Não')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={() => !disabled && set('biopsySent', true)} className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${proc.biopsySent ? 'border-teal-500 bg-teal-500' : 'border-slate-600 hover:border-teal-400'}`}>
              {proc.biopsySent && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <span className="text-sm text-slate-300">{t('common:yes', 'Sim')}</span>
          </label>
        </div>
        {proc.biopsySent && (
          <div className="space-y-1.5 animate-in fade-in">
            <label className="text-sm font-bold text-slate-400">{t('medical:surgeries.material_desc', 'Descrição do material')}</label>
            <textarea
              disabled={disabled}
              value={proc.biopsyDescription || ''}
              onChange={e => set('biopsyDescription', e.target.value)}
              rows={2}
              placeholder={t('medical:surgeries.material_desc_placeholder', 'Descreva o material enviado e o laboratório...')}
              className={textareaCls(disabled)}
            />
          </div>
        )}
      </section>
    </div>
  );
};

export default SurgeryProcedureTab;
