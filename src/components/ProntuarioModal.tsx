import { useState, useEffect } from 'react';
import { 
  X, Save, Printer, Stethoscope, 
  Activity, ClipboardList, FileText, ChevronDown
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { saveMedicalRecord, type MedicalRecord } from '../services/dataService';
import { getClinicConfig } from '../services/dataService';

interface Props {
  initialRecord: MedicalRecord;
  onClose: () => void;
  onSendReminder?: (phone: string, returnDate: string, patientName: string) => void;
}

export default function ProntuarioModal({ initialRecord, onClose, onSendReminder }: Props) {
  const { t } = useTranslation(['medical', 'common']);
  const [record, setRecord] = useState<MedicalRecord>(initialRecord);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [clinicName, setClinicName] = useState('Clínica');

  // Controle de sections
  const [openSections, setOpenSections] = useState({
    anamnese: true,
    exame: true,
    diagnostico: true
  });

  const toggleSection = (sec: keyof typeof openSections) => 
    setOpenSections(prev => ({...prev, [sec]: !prev[sec]}));

  useEffect(() => {
    getClinicConfig().then(c => {
      if (c?.name) setClinicName(c.name);
    });
  }, []);

  // Auto-save debounce (3 seconds after last change)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (record.chiefComplaint || record.diagnosis) {
        setIsSaving(true);
        try {
          await saveMedicalRecord({...record, updatedAt: new Date().toISOString()});
          setLastSaved(new Date());
        } catch (e) {
          console.error("Auto-save failed", e);
        } finally {
          setIsSaving(false);
        }
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [record]);

  const handlePrint = () => {
    window.print();
  };

  const updateRecord = (field: keyof MedicalRecord, value: any) => {
    setRecord(prev => ({ ...prev, [field]: value }));
  };

  const updatePhysical = (field: keyof NonNullable<MedicalRecord['physicalExam']>, value: any) => {
    setRecord(prev => ({
      ...prev,
      physicalExam: {
        ...prev.physicalExam,
        [field]: value ? Number(value) : undefined
      }
    }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:p-0 print:bg-white print:block">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 print:h-auto print:shadow-none print:w-full print:max-w-none print:rounded-none">
        
        {/* Header - No-print mode */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white print:hidden">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-xl">
               <FileText className="w-5 h-5" />
             </div>
             <div>
               <h2 className="text-lg font-bold text-slate-800">{t('medical:consultation.clinical_record', 'Prontuário Clínico')}</h2>
               <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                 <span>{record.date.split('-').reverse().join('/')} {t('common:at', 'às')} {record.time}</span>
                 <span>•</span>
                 {isSaving ? (
                   <span className="text-amber-500">{t('common:saving', 'Salvando...')}</span>
                 ) : lastSaved ? (
                   <span className="text-emerald-500">{t('common:saved_at', 'Salvo')} {lastSaved.toLocaleTimeString()}</span>
                 ) : (
                   <span>{t('medical:consultation.draft', 'Rascunho')}</span>
                 )}
               </div>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="px-4 py-2 bg-slate-50 text-slate-600 font-bold text-sm flex items-center gap-2 rounded-xl hover:bg-slate-100 transition-colors">
              <Printer className="w-4 h-4" /> {t('medical:documents.export_pdf', 'Exportar PDF')}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-6 pt-8 px-8">
           <h1 className="text-2xl font-black text-slate-800 uppercase tracking-widest">{clinicName}</h1>
           <h2 className="text-lg font-bold text-slate-500 uppercase mt-1">{t('medical:consultation.consultation_record', 'Prontuário de Atendimento')}</h2>
           <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
             <div><strong>{t('medical:consultation.patient', 'Paciente')}:</strong> {record.patientName}</div>
             <div><strong>{t('medical:consultation.owner', 'Tutor(a)')}:</strong> {record.clientName}</div>
             <div><strong>{t('common:date', 'Data')}:</strong> {record.date.split('-').reverse().join('/')} {t('common:at', 'às')} {record.time}</div>
             <div><strong>{t('medical:consultation.professional', 'Profissional')}:</strong> {t('medical:consultation.dr_prefix', 'Dr(a)')} {record.professionalName || t('common:not_informed', 'Não informado')}</div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 print:bg-white print:p-8 space-y-6">
          
          {/* QUEIXA & ANAMNESE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border-none print:rounded-none">
            <button onClick={() => toggleSection('anamnese')} className="w-full flex items-center justify-between p-4 bg-indigo-50/50 print:bg-transparent print:p-0 print:mb-4 hover:bg-indigo-50 transition-colors">
              <div className="flex items-center gap-2 font-bold text-indigo-900 print:text-slate-800">
                 <ClipboardList className="w-4 h-4" /> {t('medical:consultation.complaint_and_anamnesis', 'Queixa e Anamnese')}
              </div>
              <ChevronDown className={`w-4 h-4 text-indigo-400 transition-transform ${openSections.anamnese ? 'rotate-180' : ''} print:hidden`} />
            </button>
            
            {openSections.anamnese && (
              <div className="p-4 space-y-4 print:p-0">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">{t('medical:consultation.chief_complaint', 'Queixa Principal')} *</label>
                  <input 
                    type="text" 
                    value={record.chiefComplaint} 
                    onChange={e => updateRecord('chiefComplaint', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:bg-white print:border-none print:bg-transparent print:p-0"
                    placeholder={t('medical:consultation.complaint_placeholder', 'Ex: Vômito há 2 dias')}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">{t('medical:consultation.history_anamnesis', 'Histórico / Anamnese')}</label>
                  <textarea 
                    value={record.anamnesis} 
                    onChange={e => updateRecord('anamnesis', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm min-h-[100px] focus:bg-white print:border-none print:bg-transparent print:p-0"
                    placeholder={t('medical:consultation.history_placeholder', 'Detalhes do histórico...')}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">{t('medical:consultation.current_medications', 'Medicamentos em uso')}</label>
                  <input 
                    type="text" 
                    value={record.currentMedications || ''} 
                    onChange={e => updateRecord('currentMedications', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:bg-white print:border-none print:bg-transparent print:p-0"
                  />
                </div>
              </div>
            )}
          </div>

          {/* EXAME FÍSICO */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border-none print:rounded-none">
            <button onClick={() => toggleSection('exame')} className="w-full flex items-center justify-between p-4 bg-teal-50/50 print:bg-transparent print:p-0 print:mb-4 hover:bg-teal-50 transition-colors">
              <div className="flex items-center gap-2 font-bold text-teal-900 print:text-slate-800">
                 <Activity className="w-4 h-4" /> {t('medical:consultation.physical_exam', 'Exame Físico')}
              </div>
              <ChevronDown className={`w-4 h-4 text-teal-400 transition-transform ${openSections.exame ? 'rotate-180' : ''} print:hidden`} />
            </button>
            
            {openSections.exame && (
              <div className="p-4 print:p-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex justify-between">{t('medical:surgeries.weight_kg', 'Peso (kg)')}</label>
                    <input type="number" step="0.1" value={record.physicalExam?.weight || ''} onChange={e => updatePhysical('weight', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm print:border-none print:bg-transparent print:p-0" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{t('medical:surgeries.temp_c', 'Temp. (°C)')}</label>
                    <input type="number" step="0.1" value={record.physicalExam?.temperature || ''} onChange={e => updatePhysical('temperature', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm print:border-none print:bg-transparent print:p-0" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{t('medical:surgeries.hr_bpm', 'FC (bpm)')}</label>
                    <input type="number" value={record.physicalExam?.heartRate || ''} onChange={e => updatePhysical('heartRate', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm print:border-none print:bg-transparent print:p-0" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{t('medical:surgeries.rr_rpm', 'FR (rpm)')}</label>
                    <input type="number" value={record.physicalExam?.respiratoryRate || ''} onChange={e => updatePhysical('respiratoryRate', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm print:border-none print:bg-transparent print:p-0" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">{t('medical:consultation.physical_observations', 'Observações Físicas')}</label>
                  <textarea 
                    value={record.physicalExam?.observations || ''} 
                    onChange={e => updateRecord('physicalExam', { ...record.physicalExam, observations: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm h-20 print:border-none print:bg-transparent print:p-0"
                  />
                </div>
              </div>
            )}
          </div>

          {/* DIAGNÓSTICO E PRESCRIÇÃO */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border-none print:rounded-none">
            <button onClick={() => toggleSection('diagnostico')} className="w-full flex items-center justify-between p-4 bg-amber-50/50 print:bg-transparent print:p-0 print:mb-4 hover:bg-amber-50 transition-colors">
              <div className="flex items-center gap-2 font-bold text-amber-900 print:text-slate-800">
                 <Stethoscope className="w-4 h-4" /> {t('medical:consultation.diagnosis_treatment', 'Diagnóstico e Tratamento')}
              </div>
              <ChevronDown className={`w-4 h-4 text-amber-400 transition-transform ${openSections.diagnostico ? 'rotate-180' : ''} print:hidden`} />
            </button>
            
            {openSections.diagnostico && (
              <div className="p-4 space-y-4 print:p-0">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">{t('medical:consultation.diagnosis', 'Diagnóstico')} *</label>
                  <input 
                    type="text" 
                    value={record.diagnosis} 
                    onChange={e => updateRecord('diagnosis', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:bg-white print:border-none print:bg-transparent print:p-0"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">{t('medical:consultation.treatment_performed', 'Tratamento Realizado / Prescrito')}</label>
                  <textarea 
                    value={record.treatment} 
                    onChange={e => updateRecord('treatment', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm min-h-[80px] focus:bg-white print:border-none print:bg-transparent print:p-0"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">{t('medical:consultation.detailed_prescription', 'Receituário Detalhado')}</label>
                  <textarea 
                    value={record.prescription || ''} 
                    onChange={e => updateRecord('prescription', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm min-h-[120px] focus:bg-white print:border-none print:bg-transparent print:p-0 whitespace-pre-wrap font-mono"
                    placeholder={t('medical:consultation.prescription_placeholder', 'Uso Veterinário / Humano...')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{t('medical:consultation.return_date', 'Data de Retorno')}</label>
                    <input 
                      type="date" 
                      value={record.returnDate || ''} 
                      onChange={e => updateRecord('returnDate', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm print:border-none print:bg-transparent print:p-0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{t('medical:consultation.evolution', 'Evolução / Finalização')}</label>
                    <input 
                      type="text" 
                      value={record.evolution || ''} 
                      onChange={e => updateRecord('evolution', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm print:border-none print:bg-transparent print:p-0"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="hidden print:block mt-16 pt-12 border-t border-slate-300 text-center text-sm">
             <p className="mb-8">_____________________________________________________</p>
             <p className="font-bold">{t('medical:consultation.dr_prefix', 'Dr(a)')} {record.professionalName}</p>
             <p className="text-slate-500">{t('medical:consultation.signature_stamp', 'Assinatura / Carimbo')}</p>
          </div>

        </div>

        {/* Footer actions - No-print mode */}
        <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between print:hidden">
           <div>
             {record.returnDate && onSendReminder && (
               <button 
                 onClick={() => onSendReminder(record.clientId, record.returnDate!, record.patientName)}
                 className="text-xs font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl hover:bg-emerald-100 flex items-center gap-2"
               >
                 📱 {t('medical:consultation.send_return_reminder', 'Enviar lembrete de retorno')}
               </button>
             )}
           </div>
           <div className="flex gap-3">
             <button onClick={onClose} className="px-6 py-2.5 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">{t('common:back', 'Voltar')}</button>
             <button onClick={() => onClose()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-sm shadow-indigo-500/20 transition-all flex items-center gap-2">
               <Save className="w-4 h-4" /> {t('common:finalize', 'Finalizar')}
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
