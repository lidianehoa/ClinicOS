import { useState, useEffect } from 'react';
import { query, where, onSnapshot } from 'firebase/firestore';
// import { db } from '../../services/firebase';
import { AppUser, APP_ID, Hospitalization, hospitalizationsCol } from '../../services/dataService';
import { Clock, AlertTriangle, AlertCircle, Info, ChevronRight, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  userProfile: AppUser | null;
  onOpenSheet: (id: string) => void;
}

const getDurationString = (admissionDate: string) => {
  const start = new Date(admissionDate).getTime();
  const now = Date.now();
  const diff = now - start;
  
  if (diff < 0) return 'Recém chegado';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);

  if (days > 0) return `${days} dias ${hours} horas`;
  if (hours > 0) return `${hours} horas ${minutes} min`;
  return `${minutes} minutos`;
};

// @ts-ignore
const HospitalizationsList = ({ userProfile, onOpenSheet }: Props) => {
  const { t } = useTranslation(['medical', 'common']);
  const [data, setData] = useState<Hospitalization[]>([]);
  const [loading, setLoading] = useState(true);
  // @ts-ignore
  const [now, setNow] = useState(Date.now()); // for re-renders

  useEffect(() => {
    const q = query(
      hospitalizationsCol(APP_ID),
      where('status', 'in', ['active', 'triage'])
    );

    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Hospitalization));
      // Sort by admission date descending
      list.sort((a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime());
      setData(list);
      setLoading(false);
    }, err => {
      console.error(err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Timer to update durations every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const getUrgencyBadge = (level: string) => {
    switch (level) {
      case 'emergency': return <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs font-bold border border-red-500/20 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> {t('medical:urgency.emergency', 'Emergência')}</span>;
      case 'urgent': return <span className="bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded text-xs font-bold border border-orange-500/20 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {t('medical:urgency.urgent', 'Urgente')}</span>;
      case 'little_urgent': return <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded text-xs font-bold border border-amber-500/20 flex items-center gap-1"><Info className="w-3 h-3"/> {t('medical:urgency.little_urgent', 'Pouco urgente')}</span>;
      default: return <span className="bg-slate-500/10 text-slate-400 px-2 py-0.5 rounded text-xs font-bold border border-slate-500/20">{t('medical:urgency.not_urgent', 'Não urgente')}</span>;
    }
  };

  const renderSector = (
    title: string, 
    sectorId: 'hospitalized' | 'isolation' | 'quarantine' | 'triage', 
    icon: React.ReactNode, 
    colorClass: string
  ) => {
    const items = data.filter(d => d.sector === sectorId);
    
    return (
      <div className="flex flex-col h-full bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
        <div className={`p-4 border-b border-white/5 flex items-center justify-between ${colorClass}`}>
          <h2 className="font-bold flex items-center gap-2">
            {icon} {title}
          </h2>
          <span className="bg-black/20 px-2 py-0.5 rounded-md text-xs font-bold">
            {items.length}
          </span>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin">
          {items.length === 0 ? (
            <p className="text-slate-500 text-sm text-center mt-4">{t('medical:hospitalization.no_patients_sector', 'Nenhum paciente neste setor.')}</p>
          ) : (
            items.map(h => (
              <div 
                key={h.id} 
                className="bg-slate-800 border border-white/5 rounded-xl p-4 hover:border-teal-500/50 transition-colors group cursor-pointer"
                onClick={() => onOpenSheet(h.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-white font-bold text-lg leading-tight group-hover:text-teal-400 transition-colors">
                      {h.patientName}
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {h.breed || h.species} • {h.sex || 'N/I'} • {h.weight ? `${h.weight}kg` : 'N/I'}
                    </p>
                  </div>
                  {getUrgencyBadge(h.urgencyLevel)}
                </div>

                <div className="flex flex-col gap-1.5 mt-3 pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Activity className="w-3.5 h-3.5 text-slate-500 shrink-0" /> 
                    <span className="truncate">{h.admissionReason || t('medical:hospitalization.no_reason', 'Sem motivo registrado')}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1.5 text-xs font-mono bg-black/20 text-teal-400 px-2 py-1 rounded-md">
                      <Clock className="w-3.5 h-3.5" />
                      {getDurationString(h.admissionDate)}
                    </div>
                    <span className="text-xs text-teal-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                      {t('medical:surgeries.open_sheet', 'Abrir ficha')} <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="p-12 flex justify-center"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 h-full min-h-[600px] animate-in fade-in">
      {renderSector(t('medical:sectors.hospitalized', 'Internados'), 'hospitalized', <span className="text-lg">🏥</span>, 'text-slate-300')}
      {renderSector(t('medical:sectors.isolation', 'Isolamento'), 'isolation', <span className="text-lg">🔴</span>, 'text-red-400')}
      {renderSector(t('medical:sectors.quarantine', 'Quarentena'), 'quarantine', <span className="text-lg">🟡</span>, 'text-amber-400')}
      {renderSector(t('medical:sectors.triage', 'Triagem'), 'triage', <span className="text-lg">🔵</span>, 'text-teal-400')}
    </div>
  );
};

export default HospitalizationsList;
