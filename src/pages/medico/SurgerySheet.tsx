import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { AppUser, APP_ID, Surgery, SurgicalAdmission, AnesthesiaProtocol, SurgicalProcedure, PostOperative, SurgicalSupplyUsed, surgeriesCol } from '../../services/dataService';
import SurgeryAdmissionTab from '../../components/medical/SurgeryAdmissionTab';
import SurgeryAnesthesiaTab from '../../components/medical/SurgeryAnesthesiaTab';
import SurgeryProcedureTab from '../../components/medical/SurgeryProcedureTab';
import SurgeryPostOpTab from '../../components/medical/SurgeryPostOpTab';
import SurgerySuppliesTab from '../../components/medical/SurgerySuppliesTab';
import FinalizeSurgeryModal from '../../components/medical/FinalizeSurgeryModal';
import { ChevronLeft, Save, FileText, Loader2, CheckCircle, Scissors, Clock, User, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  surgeryId: string;
  userProfile: AppUser | null;
  onBack: () => void;
}

type TabId = 'admission' | 'anesthesia' | 'procedure' | 'postop' | 'supplies';

const STATUS_CONFIG = {
  scheduled: { label: 'Agendada', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  admission: { label: 'Em Admissão', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  in_progress: { label: 'Em Andamento', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  completed: { label: 'Concluída', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  cancelled: { label: 'Cancelada', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

const SurgerySheet = ({ surgeryId, userProfile, onBack }: Props) => {
  const { t } = useTranslation(['medical', 'common']);
  const [data, setData] = useState<Surgery | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('admission');
  const [showFinalize, setShowFinalize] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const surgRef = doc(surgeriesCol(APP_ID), surgeryId);
    const unsub = onSnapshot(surgRef, snap => {
      if (snap.exists()) {
        const raw = { id: snap.id, ...snap.data() } as Surgery;
        // Ensure nested defaults
        raw.admission = raw.admission || { asaClassification: 'I', fastingConfirmed: false, consentSigned: false, surgicalPurpose: '', clinicalIndication: '' };
        raw.anesthesia = raw.anesthesia || { type: 'general', mpa: [], induction: [], maintenance: '', monitoring: [] };
        raw.procedure = raw.procedure || { procedureName: '', procedureDescription: '', biopsySent: false };
        raw.postOp = raw.postOp || { instructions: '', homeMedications: [] };
        raw.suppliesUsed = raw.suppliesUsed || [];
        setData(raw);
      }
      setLoading(false);
    }, err => { console.error(err); setLoading(false); });
    return () => unsub();
  }, [surgeryId]);

  const autoSave = (updated: Surgery) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try {
        const surgRef = doc(surgeriesCol(APP_ID), surgeryId);
        await updateDoc(surgRef, { ...updated, updatedAt: new Date().toISOString() });
      } catch (err) { console.error(err); }
    }, 2000);
  };

  const handleUpdate = (updated: Surgery) => {
    setData(updated);
    autoSave(updated);
  };

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const surgRef = doc(surgeriesCol(APP_ID), surgeryId);
      await updateDoc(surgRef, { ...data, updatedAt: new Date().toISOString() });
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (status: Surgery['status']) => {
    if (!data) return;
    const surgRef = doc(surgeriesCol(APP_ID), surgeryId);
    await updateDoc(surgRef, { status, updatedAt: new Date().toISOString() });
  };

  const handlePrint = () => {
    if (!data) return;
    const anesthType: Record<string, string> = {
      general: 'Geral',
      epidural: 'Epidural',
      local: 'Local',
      loco_regional: 'Locorregional',
      combined: 'Combinada',
    };
    const medList = (meds: any[]) => meds.map(m => `${m.productName} ${m.dose} ${m.route}${m.time ? ` às ${m.time}` : ''}`).join('\n');

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Relatório Cirúrgico — ${data.patientName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 40px; line-height: 1.6; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  h2 { font-size: 14px; margin: 20px 0 6px 0; border-bottom: 1px solid #ccc; padding-bottom: 3px; text-transform: uppercase; letter-spacing: 1px; }
  h3 { font-size: 12px; margin: 10px 0 3px 0; color: #555; }
  .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 20px; }
  .clinic { font-size: 14px; font-weight: bold; color: #333; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
  .field { margin-bottom: 4px; }
  .label { font-weight: bold; color: #555; }
  pre { font-family: inherit; white-space: pre-wrap; background: #f8f8f8; padding: 8px; border-radius: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; font-size: 11px; }
  th { background: #f0f0f0; font-weight: bold; }
  .total { font-weight: bold; font-size: 13px; }
  .sign { margin-top: 40px; border-top: 1px solid #999; padding-top: 8px; }
  @media print { @page { margin: 20mm; } }
</style>
</head>
<body>
  <div class="header">
    <div class="clinic">ClinicOS — Relatório Cirúrgico</div>
    <h1>Prontuário Cirúrgico</h1>
    <p>Data: ${data.scheduledDate.split('-').reverse().join('/')} • ${data.scheduledTime}</p>
  </div>

  <h2>Identificação do Paciente</h2>
  <div class="grid">
    <div><span class="label">Paciente:</span> ${data.patientName}</div>
    <div><span class="label">Responsável:</span> ${data.clientName}</div>
    <div><span class="label">Espécie:</span> ${data.species || '—'}</div>
    <div><span class="label">Raça:</span> ${data.breed || '—'}</div>
    <div><span class="label">Sexo:</span> ${data.sex || '—'}</div>
    <div><span class="label">Peso:</span> ${data.admission?.admissionWeight || data.weight || '—'} kg</div>
  </div>

  <h2>Equipe Cirúrgica</h2>
  <div class="grid">
    <div><span class="label">Cirurgião:</span> ${data.surgeonName}</div>
    ${data.anesthesiologistName ? `<div><span class="label">Anestesista:</span> ${data.anesthesiologistName}</div>` : ''}
    ${data.assistantName ? `<div><span class="label">Auxiliar:</span> ${data.assistantName}</div>` : ''}
  </div>

  <h2>Admissão Pré-cirúrgica</h2>
  <div class="grid">
    <div><span class="label">Procedimento:</span> ${data.admission?.surgicalPurpose || '—'}</div>
    <div><span class="label">Indicação clínica:</span> ${data.admission?.clinicalIndication || '—'}</div>
    <div><span class="label">Classificação ASA:</span> ${data.admission?.asaClassification || '—'}</div>
    <div><span class="label">Jejum:</span> ${data.admission?.fastingHours || '—'} h — ${data.admission?.fastingConfirmed ? 'Confirmado' : 'Não confirmado'}</div>
    <div><span class="label">FC:</span> ${data.admission?.admissionHeartRate || '—'} bpm</div>
    <div><span class="label">Temp:</span> ${data.admission?.admissionTemperature || '—'} °C</div>
    <div><span class="label">SpO2:</span> ${data.admission?.admissionSpO2 || '—'} %</div>
    <div><span class="label">PA:</span> ${data.admission?.admissionPressure || '—'}</div>
  </div>

  <h2>Protocolo Anestésico</h2>
  <div><span class="label">Tipo:</span> ${anesthType[data.anesthesia?.type] || '—'}</div>
  ${(data.anesthesia?.mpa || []).length > 0 ? `<h3>Pré-anestésico (MPA)</h3><pre>${medList(data.anesthesia.mpa)}</pre>` : ''}
  ${(data.anesthesia?.induction || []).length > 0 ? `<h3>Indução</h3><pre>${medList(data.anesthesia.induction)}</pre>` : ''}
  ${data.anesthesia?.maintenance ? `<h3>Manutenção</h3><p>${data.anesthesia.maintenance}</p>` : ''}
  ${(data.anesthesia?.monitoring || []).length > 0 ? `<div style="margin-top:8px"><span class="label">Monitoração:</span> ${data.anesthesia.monitoring.join(', ')}</div>` : ''}
  ${data.anesthesia?.recoveryNotes ? `<h3>Recuperação</h3><p>${data.anesthesia.recoveryNotes}</p>` : ''}

  <h2>Procedimento Cirúrgico</h2>
  <div class="grid">
    <div><span class="label">Procedimento:</span> ${data.procedure?.procedureName || '—'}</div>
    <div><span class="label">Início:</span> ${data.procedure?.startTime || '—'} • <span class="label">Término:</span> ${data.procedure?.endTime || '—'} • <span class="label">Duração:</span> ${data.procedure?.duration || '—'} min</div>
  </div>
  ${data.procedure?.procedureDescription ? `<h3>Descrição detalhada</h3><pre>${data.procedure.procedureDescription}</pre>` : ''}
  ${data.procedure?.findings ? `<h3>Achados intraoperatórios</h3><pre>${data.procedure.findings}</pre>` : ''}
  ${data.procedure?.complications ? `<h3>Intercorrências</h3><p>${data.procedure.complications}</p>` : '<p><span class="label">Intercorrências:</span> Nenhuma</p>'}
  ${data.procedure?.synthesis ? `<h3>Síntese/Fechamento</h3><p>${data.procedure.synthesis}</p>` : ''}

  <h2>Insumos Utilizados</h2>
  ${(data.suppliesUsed || []).length > 0 ? `
  <table>
    <tr><th>Produto</th><th>Qtd</th><th>Unidade</th><th>Custo Unit.</th><th>Total</th></tr>
    ${(data.suppliesUsed || []).map(s => `<tr><td>${s.productName}</td><td>${s.quantity}</td><td>${s.unit}</td><td>R$ ${(s.unitCost || 0).toFixed(2)}</td><td>R$ ${(s.totalCost || 0).toFixed(2)}</td></tr>`).join('')}
    <tr class="total"><td colspan="4" style="text-align:right">Total:</td><td>R$ ${(data.suppliesUsed || []).reduce((s, i) => s + (i.totalCost || 0), 0).toFixed(2)}</td></tr>
  </table>` : '<p>Nenhum insumo registrado.</p>'}

  <h2>Pós-operatório</h2>
  ${data.postOp?.restrictions ? `<p><span class="label">Restrições:</span> ${data.postOp.restrictions}</p>` : ''}
  ${data.postOp?.instructions ? `<h3>Instruções</h3><pre>${data.postOp.instructions}</pre>` : ''}
  ${(data.postOp?.homeMedications || []).length > 0 ? `
  <h3>Medicamentos prescritos para casa</h3>
  <table>
    <tr><th>Medicamento</th><th>Dose</th><th>Frequência</th><th>Duração</th></tr>
    ${(data.postOp.homeMedications).map(m => `<tr><td>${m.medication}</td><td>${m.dosage}</td><td>${m.frequency}</td><td>${m.duration}</td></tr>`).join('')}
  </table>` : ''}
  ${data.postOp?.returnDate ? `<p style="margin-top:8px"><span class="label">Retorno:</span> ${data.postOp.returnDate.split('-').reverse().join('/')} — ${data.postOp.returnInstructions || ''}</p>` : ''}

  <div class="sign">
    <p>Assinatura: ________________________</p>
    <p>${data.surgeonName}${userProfile?.crmv ? ` — CRMV ${userProfile.crmv}` : ''}</p>
  </div>
</body>
</html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.onload = () => win.print();
    }
  };

  if (loading || !data) {
    return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 text-teal-500 animate-spin" /></div>;
  }

  const isCompleted = data.status === 'completed' || data.status === 'cancelled';
  const statusCfg = STATUS_CONFIG[data.status] || STATUS_CONFIG.scheduled;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'admission', label: 'Admissão' },
    { id: 'anesthesia', label: 'Anestesia' },
    { id: 'procedure', label: 'Cirurgia' },
    { id: 'postop', label: 'Pós-op' },
    { id: 'supplies', label: 'Insumos' },
  ];

  return (
    <div className="h-full flex flex-col space-y-4">

      {/* TOP BAR */}
      <div className="flex items-center justify-between gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors shrink-0">
          <ChevronLeft className="w-5 h-5" /> {t('common:back', 'Voltar')}
        </button>
        <div className="flex items-center gap-3">
          <button onClick={handlePrint} className="flex items-center gap-2 text-slate-400 hover:text-white bg-slate-800 border border-white/5 px-4 py-2 rounded-xl font-bold text-sm transition-all">
            <FileText className="w-4 h-4" /> {t('medical:surgeries.export_pdf', 'Exportar PDF')}
          </button>
          {!isCompleted && (
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('common:save', 'Salvar')}
            </button>
          )}
          {isCompleted && (
            <div className={`px-4 py-2 rounded-xl font-bold text-sm border ${statusCfg.color} flex items-center gap-2`}>
              <CheckCircle className="w-4 h-4" /> {statusCfg.label}
            </div>
          )}
        </div>
      </div>

      {/* PATIENT CARD */}
      <div className="bg-slate-800 border border-white/5 rounded-2xl p-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              🐾 {data.patientName}
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              {t('medical:consultation.owner', 'Responsável:')} <span className="text-slate-300 font-medium">{data.clientName}</span>
              {data.clientPhone && <span className="text-slate-500"> • {data.clientPhone}</span>}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-slate-300">
              {data.species && <span>{data.species}</span>}
              {data.breed && <><span className="text-slate-600">•</span><span>{data.breed}</span></>}
              {data.sex && <><span className="text-slate-600">•</span><span>{data.sex}</span></>}
              {(data.admission?.admissionWeight || data.weight) && <><span className="text-slate-600">•</span><span className="font-bold">{data.admission?.admissionWeight || data.weight} kg</span></>}
            </div>
          </div>

          <div className="text-right bg-slate-900/50 p-4 rounded-xl border border-white/5 shrink-0">
            <p className="text-sm font-bold text-teal-400 flex items-center gap-2 justify-end">
              <Scissors className="w-4 h-4" />
              {data.admission?.surgicalPurpose || data.procedure?.procedureName || t('medical:surgeries.procedure', 'Procedimento')}
            </p>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 justify-end">
              <Clock className="w-3.5 h-3.5" />
              {data.scheduledDate.split('-').reverse().join('/')} às {data.scheduledTime}
              {data.estimatedDuration && <span>• ~{data.estimatedDuration}min</span>}
            </p>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 justify-end">
              <User className="w-3 h-3" />
              {data.surgeonName}
              {data.anesthesiologistName && ` • ${data.anesthesiologistName}`}
            </p>
          </div>
        </div>

        {/* STATUS ACTIONS */}
        {!isCompleted && (
          <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('medical:surgeries.change_status', 'Alterar status:')}</span>
            {(['scheduled', 'admission', 'in_progress'] as Surgery['status'][]).filter(s => s !== data.status).map(s => (
              <button
                key={s}
                onClick={() => handleUpdateStatus(s)}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition-all ${STATUS_CONFIG[s]?.color}`}
              >
                → {STATUS_CONFIG[s]?.label}
              </button>
            ))}
            <button onClick={() => handleUpdateStatus('cancelled')} className="text-xs px-3 py-1.5 rounded-lg font-bold border bg-red-500/10 text-red-400 border-red-500/20 transition-all ml-auto">
              <AlertCircle className="w-3.5 h-3.5 inline mr-1" /> {t('medical:surgeries.cancel_surgery', 'Cancelar Cirurgia')}
            </button>
          </div>
        )}
      </div>

      {/* TABS */}
      <div className="flex items-center gap-1 border-b border-white/5 overflow-x-auto scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 font-bold text-sm whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${activeTab === tab.id ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div className="flex-1 overflow-auto bg-slate-800 border border-white/5 rounded-2xl min-h-0">
        {activeTab === 'admission' && (
          <SurgeryAdmissionTab
            surgery={data}
            onUpdate={(admission: SurgicalAdmission) => handleUpdate({ ...data, admission })}
            disabled={isCompleted}
          />
        )}
        {activeTab === 'anesthesia' && (
          <SurgeryAnesthesiaTab
            surgery={data}
            onUpdate={(anesthesia: AnesthesiaProtocol) => handleUpdate({ ...data, anesthesia })}
            disabled={isCompleted}
          />
        )}
        {activeTab === 'procedure' && (
          <SurgeryProcedureTab
            surgery={data}
            onUpdate={(procedure: SurgicalProcedure) => handleUpdate({ ...data, procedure })}
            disabled={isCompleted}
          />
        )}
        {activeTab === 'postop' && (
          <SurgeryPostOpTab
            surgery={data}
            onUpdate={(postOp: PostOperative) => handleUpdate({ ...data, postOp })}
            disabled={isCompleted}
            onFinalize={() => setShowFinalize(true)}
          />
        )}
        {activeTab === 'supplies' && (
          <SurgerySuppliesTab
            surgery={data}
            onUpdate={(suppliesUsed: SurgicalSupplyUsed[]) => handleUpdate({ ...data, suppliesUsed })}
            disabled={isCompleted}
          />
        )}
      </div>

      {showFinalize && (
        <FinalizeSurgeryModal
          surgery={data}
          operatorName={userProfile?.nome || 'Sistema'}
          onCancel={() => setShowFinalize(false)}
          onSuccess={() => {
            setShowFinalize(false);
            onBack();
          }}
        />
      )}
    </div>
  );
};

export default SurgerySheet;
