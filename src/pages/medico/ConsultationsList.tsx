import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { AppUser, APP_ID, Consultation } from '../../services/dataService';
import { Search, Plus, User, FileText, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ConsultationsList = ({ userProfile, onOpen }: { userProfile: AppUser | null, onOpen: (id: string) => void }) => {
  const { t } = useTranslation(['medical', 'common']);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('hoje'); // 'hoje', 'todos'
  const [filterStatus, setFilterStatus] = useState('todas'); // 'todas', 'open', 'completed'

  useEffect(() => {
    const fetchConsultations = async () => {
      setLoading(true);
      try {
        const profIds = [userProfile?.staffId, userProfile?.uid].filter(Boolean);
        if (profIds.length === 0) profIds.push('__dummy__');

        const q = query(
          collection(db, 'artifacts', APP_ID, 'public', 'data', 'consultations'),
          where('professionalId', 'in', profIds)
        );
        const snap = await getDocs(q);
        let data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Consultation));

        // Filtro de data
        if (filterDate === 'hoje') {
          const today = new Date().toISOString().split('T')[0];
          data = data.filter(c => c.date === today);
        }

        // Filtro de status
        if (filterStatus !== 'todas') {
          data = data.filter(c => c.status === filterStatus);
        }

        // Sort por data e hora (mais recentes/próximas primeiro)
        data.sort((a, b) => {
          const dtA = new Date(`${a.date}T${a.time || '00:00'}`);
          const dtB = new Date(`${b.date}T${b.time || '00:00'}`);
          return dtB.getTime() - dtA.getTime();
        });

        setConsultations(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (userProfile?.uid) fetchConsultations();
  }, [userProfile, filterDate, filterStatus]);

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('consultations.title', 'Consultas')}</h1>
          <p className="text-slate-400 text-sm mt-1">{t('consultations.subtitle', 'Gerencie seus atendimentos e retornos')}</p>
        </div>
        <button className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all">
          <Plus className="w-5 h-5" /> {t('consultations.btn_new', 'Nova Consulta Avulsa')}
        </button>
      </div>

      {/* FILTERS */}
      <div className="bg-slate-800 border border-white/5 p-4 rounded-2xl flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-5 h-5 text-slate-500 absolute left-3 top-3" />
          <input 
            type="text" 
            placeholder={t('consultations.search_placeholder', 'Buscar paciente ou cliente...')}
            className="w-full bg-slate-900 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-white outline-none focus:border-teal-500 transition-colors text-sm"
          />
        </div>
        <div className="flex gap-4">
          <select 
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500 transition-colors text-sm cursor-pointer"
          >
            <option value="hoje">{t('consultations.filter_today', 'Hoje')}</option>
            <option value="todos">{t('consultations.filter_all_days', 'Todos os dias')}</option>
          </select>
          <select 
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500 transition-colors text-sm cursor-pointer"
          >
            <option value="todas">{t('consultations.filter_all_status', 'Todos Status')}</option>
            <option value="open">{t('consultations.status_open', 'Em andamento')}</option>
            <option value="completed">{t('consultations.status_completed', 'Finalizados')}</option>
          </select>
        </div>
      </div>

      {/* LIST */}
      <div className="bg-slate-800 border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : consultations.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <FileText className="w-12 h-12 text-slate-600 mb-4" />
            <h3 className="text-white font-bold text-lg">{t('consultations.empty_title', 'Nenhuma consulta encontrada')}</h3>
            <p className="text-slate-400 text-sm">{t('consultations.empty_subtitle', 'Altere os filtros ou crie uma nova consulta.')}</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {consultations.map(c => (
              <div key={c.id} className="p-4 sm:p-6 hover:bg-white/5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group cursor-pointer" onClick={() => onOpen(c.id)}>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-slate-900 rounded-xl flex flex-col items-center justify-center border border-white/5 shrink-0 mt-1">
                    <span className="text-sm font-bold text-white">{c.time || '--:--'}</span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                      {c.patientName} 
                      <span className="text-sm text-slate-500 font-medium">/ {c.clientName}</span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm">
                      <span className="text-teal-400 font-medium">{c.consultationType || t('consultations.type_general', 'Consulta Geral')}</span>
                      <span className="text-slate-500 flex items-center gap-1">
                        <User className="w-4 h-4" /> {c.professionalName}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6">
                  <div className="flex items-center gap-2">
                    {c.status === 'completed' ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {t('consultations.status_completed', 'Finalizado')}
                      </div>
                    ) : c.status === 'open' ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 text-xs font-bold uppercase">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> {t('consultations.status_open', 'Em andamento')}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-500/10 text-slate-400 text-xs font-bold uppercase">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400" /> {t('consultations.status_draft', 'Rascunho')}
                      </div>
                    )}
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white font-bold rounded-xl md:opacity-0 md:group-hover:opacity-100 transition-all hover:bg-teal-500 hover:text-white">
                    {t('common:view')} <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default ConsultationsList;
