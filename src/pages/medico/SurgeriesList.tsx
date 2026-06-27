import { useState, useEffect } from 'react';
import { AppUser, Surgery, subscribeSurgeries } from '../../services/dataService';
import { Clock, ChevronRight, Scissors, User, Search, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  userProfile: AppUser | null;
  onOpenSheet: (id: string) => void;
}

const STATUS_CONFIG: Record<Surgery['status'], { label: string; dot: string; badge: string }> = {
  scheduled: { label: 'Agendada', dot: 'bg-slate-400', badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  admission: { label: 'Admissão', dot: 'bg-teal-400', badge: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  in_progress: { label: 'Em andamento', dot: 'bg-amber-400 animate-pulse', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  completed: { label: 'Concluída', dot: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  cancelled: { label: 'Cancelada', dot: 'bg-red-500', badge: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

const SurgeriesList = ({ onOpenSheet }: Props) => {
  const { t } = useTranslation(['medical', 'common']);
  const [surgeries, setSurgeries] = useState<Surgery[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState<'all' | Surgery['status']>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsub = subscribeSurgeries(data => {
      setSurgeries(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = surgeries.filter(s => {
    const dateMatch = !filterDate || s.scheduledDate === filterDate;
    const statusMatch = filterStatus === 'all' || s.status === filterStatus;
    const q = search.toLowerCase();
    const textMatch = !q ||
      s.patientName.toLowerCase().includes(q) ||
      s.clientName.toLowerCase().includes(q) ||
      (s.admission?.surgicalPurpose || '').toLowerCase().includes(q) ||
      (s.procedure?.procedureName || '').toLowerCase().includes(q);
    return dateMatch && statusMatch && textMatch;
  });

  const grouped: Record<string, Surgery[]> = {};
  for (const s of filtered) {
    const time = s.scheduledTime || '00:00';
    const hour = time.substring(0, 2) + ':00';
    if (!grouped[hour]) grouped[hour] = [];
    grouped[hour].push(s);
  }
  const sortedHours = Object.keys(grouped).sort();

  if (loading) {
    return <div className="p-12 flex justify-center"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col space-y-5 h-full">

      {/* FILTERS */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-slate-800 border border-white/5 rounded-xl px-3 py-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="bg-transparent text-white outline-none text-sm"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as any)}
          className="bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500 text-sm"
        >
          <option value="all">{t('medical:surgeries.all_status', 'Todos os status')}</option>
          {(Object.keys(STATUS_CONFIG) as Surgery['status'][]).map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
        <div className="flex items-center gap-2 bg-slate-800 border border-white/5 rounded-xl px-3 py-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('medical:surgeries.search_placeholder', 'Buscar paciente, procedimento...')}
            className="bg-transparent text-white outline-none text-sm w-full"
          />
        </div>
      </div>

      {/* LIST */}
      <div className="flex-1 overflow-auto space-y-6 pb-4">
        {filtered.length === 0 ? (
          <div className="bg-slate-800 border border-white/5 rounded-2xl p-16 text-center">
            <Scissors className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">{t('medical:surgeries.no_surgeries', 'Nenhuma cirurgia encontrada para os filtros selecionados.')}</p>
            <button onClick={() => { setFilterDate(''); setFilterStatus('all'); setSearch(''); }} className="mt-4 text-teal-400 hover:text-teal-300 text-sm font-bold transition-colors underline">
              {t('common:clear_filters', 'Limpar filtros')}
            </button>
          </div>
        ) : (
          sortedHours.map(hour => (
            <div key={hour} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold font-mono uppercase tracking-widest">
                  <Clock className="w-3.5 h-3.5" />
                  {hour}
                </div>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              {grouped[hour].map(surg => {
                const statusCfg = STATUS_CONFIG[surg.status];
                const procedureName = surg.admission?.surgicalPurpose || surg.procedure?.procedureName || '—';
                return (
                  <div
                    key={surg.id}
                    className="bg-slate-800 border border-white/5 rounded-2xl p-5 hover:border-teal-500/50 transition-all group cursor-pointer"
                    onClick={() => onOpenSheet(surg.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusCfg.dot}`} />
                          <h3 className="text-white font-bold text-lg group-hover:text-teal-400 transition-colors truncate">
                            {surg.patientName}
                          </h3>
                          <span className="text-slate-400 text-sm font-medium shrink-0">/ {surg.clientName}</span>
                        </div>

                        <p className="text-slate-300 text-sm font-medium ml-5.5 pl-0 mb-2 flex items-center gap-2">
                          <Scissors className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          {procedureName}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 ml-0">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" /> {surg.surgeonName}
                          </span>
                          {surg.anesthesiologistName && (
                            <span>Anest: {surg.anesthesiologistName}</span>
                          )}
                          {surg.estimatedDuration && (
                            <span>~{surg.estimatedDuration}min</span>
                          )}
                          {surg.admission?.asaClassification && (
                            <span className="bg-slate-900 px-2 py-0.5 rounded font-mono">ASA {surg.admission.asaClassification}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${statusCfg.badge}`}>
                          {statusCfg.label}
                        </span>
                        <button className="bg-teal-500/10 text-teal-400 hover:bg-teal-500 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-teal-500/20 flex items-center gap-1.5">
                          {t('medical:surgeries.open_sheet', 'Abrir ficha')} <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SurgeriesList;
