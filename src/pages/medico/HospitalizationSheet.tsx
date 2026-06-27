import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
// import { db } from '../../services/firebase';
import { AppUser, APP_ID, Hospitalization, hospitalizationsCol } from '../../services/dataService';
import { ChevronLeft, Syringe, Activity, Package, CheckSquare, Clock, Edit2, Loader2, Save } from 'lucide-react';
import HospitalizationPrescriptions from '../../components/medical/HospitalizationPrescriptions';
import HospitalizationEvolutions from '../../components/medical/HospitalizationEvolutions';
import HospitalizationSupplies from '../../components/medical/HospitalizationSupplies';
import DischargeModal from '../../components/medical/DischargeModal';
import { useTranslation } from 'react-i18next';

interface Props {
  hospitalizationId: string;
  userProfile: AppUser | null;
  onBack: () => void;
}

const getDurationString = (admissionDate: string) => {
  const start = new Date(admissionDate).getTime();
  const now = Date.now();
  const diff = now - start;
  if (diff < 0) return 'Recém chegado';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  if (days > 0) return `${days} dias ${hours} horas`;
  return `${hours} horas`;
};

const HospitalizationSheet = ({ hospitalizationId, userProfile, onBack }: Props) => {
  const { t } = useTranslation(['medical', 'common']);
  const [data, setData] = useState<Hospitalization | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'prescriptions' | 'evolutions' | 'supplies'>('prescriptions');
  
  // Forms
  const [editingInfo, setEditingInfo] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [showDischarge, setShowDischarge] = useState(false);

  useEffect(() => {
    const fetchHosp = async () => {
      try {
        const hRef = doc(hospitalizationsCol(APP_ID), hospitalizationId);
        const snap = await getDoc(hRef);
        if (snap.exists()) {
          setData({ id: snap.id, ...snap.data() } as Hospitalization);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHosp();
  }, [hospitalizationId]);

  const handleUpdateInfo = async () => {
    if (!data) return;
    setSavingInfo(true);
    try {
      const hRef = doc(hospitalizationsCol(APP_ID), hospitalizationId);
      await updateDoc(hRef, {
        sector: data.sector,
        box: data.box || '',
        urgencyLevel: data.urgencyLevel,
        diagnosis: data.diagnosis || '',
        updatedAt: new Date().toISOString()
      });
      setEditingInfo(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar.');
    } finally {
      setSavingInfo(false);
    }
  };

  if (loading || !data) {
    return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 text-teal-500 animate-spin" /></div>;
  }

  const isDischarged = data.status === 'discharged';

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" /> {t('common:back', 'Voltar')}
        </button>
        {!isDischarged && (
          <button onClick={() => setShowDischarge(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold transition-all flex items-center gap-2">
            <CheckSquare className="w-4 h-4" /> {t('medical:hospitalization.discharge', 'Dar Alta')}
          </button>
        )}
        {isDischarged && (
          <div className="bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl font-bold border border-emerald-500/20">
            ✅ Alta concedida em {new Date(data.dischargeDate).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* PATIENT INFO CARD */}
      <div className="bg-slate-800 border border-white/5 rounded-2xl p-6 relative">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              🐾 {data.patientName} 
              <span className="text-xs font-mono bg-black/30 text-slate-400 px-2 py-1 rounded-md">ID: {data.id.substring(0,6)}</span>
            </h1>
            <p className="text-slate-400 mt-1">{t('medical:hospitalization.owner', 'Dono:')} <span className="text-slate-300 font-medium">{data.clientName}</span></p>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
              <span className="text-slate-300">{data.breed || data.species} • {data.sex || 'N/I'} • {data.weight ? `${data.weight} kg` : 'N/I'}</span>
              <span className="text-slate-500">•</span>
              <span className="text-teal-400 font-bold flex items-center gap-1.5"><Clock className="w-4 h-4" /> Internado há {getDurationString(data.admissionDate)}</span>
            </div>
            
            <div className="mt-4 flex items-center gap-4">
              {editingInfo ? (
                <>
                  <select value={data.sector} onChange={e => setData({...data, sector: e.target.value as any})} className="bg-slate-900 border border-white/5 rounded-lg px-3 py-1.5 text-white outline-none text-sm">
                    <option value="hospitalized">🏥 Internação Geral</option>
                    <option value="isolation">🔴 Isolamento</option>
                    <option value="quarantine">🟡 Quarentena</option>
                    <option value="triage">🔵 Triagem</option>
                  </select>
                  <input type="text" value={data.box || ''} onChange={e => setData({...data, box: e.target.value})} placeholder="Baia/Box" className="w-24 bg-slate-900 border border-white/5 rounded-lg px-3 py-1.5 text-white outline-none text-sm" />
                  <select value={data.urgencyLevel} onChange={e => setData({...data, urgencyLevel: e.target.value as any})} className="bg-slate-900 border border-white/5 rounded-lg px-3 py-1.5 text-white outline-none text-sm">
                    <option value="emergency">🚨 Emergência</option>
                    <option value="urgent">🔴 Urgente</option>
                    <option value="little_urgent">🟡 Pouco Urgente</option>
                    <option value="not_urgent">⚪ Não Urgente</option>
                  </select>
                  <button onClick={handleUpdateInfo} disabled={savingInfo} className="bg-teal-500 text-white p-1.5 rounded-lg hover:bg-teal-600 transition-colors">
                    {savingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                </>
              ) : (
                <>
                  <span className="bg-slate-900 border border-white/5 px-3 py-1.5 rounded-lg text-sm text-slate-300 font-bold flex items-center gap-2">
                    {data.sector === 'hospitalized' ? '🏥 Internação Geral' : data.sector === 'isolation' ? '🔴 Isolamento' : data.sector === 'quarantine' ? '🟡 Quarentena' : '🔵 Triagem'}
                  </span>
                  <span className="bg-slate-900 border border-white/5 px-3 py-1.5 rounded-lg text-sm text-slate-300 font-bold">
                    Box: {data.box || 'N/I'}
                  </span>
                  <span className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${data.urgencyLevel === 'emergency' ? 'bg-red-500/10 text-red-400 border-red-500/20' : data.urgencyLevel === 'urgent' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : data.urgencyLevel === 'little_urgent' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                    {data.urgencyLevel === 'emergency' ? '🚨 Emergência' : data.urgencyLevel === 'urgent' ? '🔴 Urgente' : data.urgencyLevel === 'little_urgent' ? '🟡 Pouco Urgente' : '⚪ Não Urgente'}
                  </span>
                  {!isDischarged && <button onClick={() => setEditingInfo(true)} className="text-slate-400 hover:text-white p-1.5"><Edit2 className="w-4 h-4" /></button>}
                </>
              )}
            </div>
          </div>
          
          <div className="md:text-right bg-slate-900/50 p-4 rounded-xl border border-white/5 w-full md:w-auto min-w-[250px]">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t('medical:hospitalization.reason', 'Motivo / Diagnóstico')}</p>
            <p className="text-sm text-slate-300 mb-2">{data.admissionReason}</p>
            {editingInfo ? (
              <input type="text" value={data.diagnosis || ''} onChange={e => setData({...data, diagnosis: e.target.value})} placeholder="Diagnóstico" className="w-full bg-slate-900 border border-white/5 rounded-lg px-3 py-1.5 text-white outline-none text-sm" />
            ) : (
              <p className="text-sm font-bold text-teal-400">{data.diagnosis || 'Sem diagnóstico fechado'}</p>
            )}
            <p className="text-xs text-slate-500 mt-2">Dr(a). {data.professionalName}</p>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-2 border-b border-white/5">
        <button onClick={() => setActiveTab('prescriptions')} className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'prescriptions' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-white'}`}>
          <Syringe className="w-4 h-4" /> {t('medical:hospitalization.tab_prescriptions', 'Prescrições')}
        </button>
        <button onClick={() => setActiveTab('evolutions')} className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'evolutions' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-white'}`}>
          <Activity className="w-4 h-4" /> {t('medical:hospitalization.tab_evolutions', 'Evolução Clínica')}
        </button>
        <button onClick={() => setActiveTab('supplies')} className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'supplies' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-white'}`}>
          <Package className="w-4 h-4" /> {t('medical:hospitalization.tab_supplies', 'Insumos & Custos')}
        </button>
      </div>

      {/* TAB CONTENT */}
      <div className="flex-1 overflow-auto bg-slate-800 border border-white/5 rounded-2xl">
        {activeTab === 'prescriptions' && <HospitalizationPrescriptions hospitalization={data} userProfile={userProfile} />}
        {activeTab === 'evolutions' && <HospitalizationEvolutions hospitalization={data} userProfile={userProfile} />}
        {activeTab === 'supplies' && <HospitalizationSupplies hospitalization={data} userProfile={userProfile} />}
      </div>

      {showDischarge && (
        <DischargeModal 
          hospitalization={data}
          onCancel={() => setShowDischarge(false)}
          onSuccess={() => {
            setShowDischarge(false);
            onBack();
          }}
        />
      )}
    </div>
  );
};

export default HospitalizationSheet;
