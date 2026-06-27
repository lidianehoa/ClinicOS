import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, User, ChevronRight } from 'lucide-react';
import { AppUser, APP_ID } from '../../services/dataService';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

const MedicalDashboard = ({ userProfile }: { userProfile: AppUser | null }) => {
  const { t } = useTranslation(['medical', 'common']);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    agendaHoje: 0,
    internadosAtivos: 0,
    cirurgiasHoje: 0,
    consultasAbertas: 0
  });

  const [proximasConsultas, setProximasConsultas] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];

        const profIds = [userProfile?.staffId, userProfile?.uid].filter(Boolean);
        if (profIds.length === 0) profIds.push('__dummy__');

        // 1. Agenda Hoje (Agendamentos daquele profissional na data de hoje)
        // Usando as queries de agendamento (limitaremos aqui a algo generico se a collection for appointments)
        const qAgenda = query(
          collection(db, 'artifacts', APP_ID, 'public', 'data', 'appointments'),
          where('date', '==', dateStr),
          where('professionalId', 'in', profIds)
        );
        const snapAgenda = await getDocs(qAgenda).catch(() => ({ docs: [] }));

        // 2. Internados ativos (status == 'active' ou algo similar em hospitalizations)
        const qInternados = query(
          collection(db, 'artifacts', APP_ID, 'public', 'data', 'hospitalizations'),
          where('status', '==', 'active')
        );
        const snapInternados = await getDocs(qInternados).catch(() => ({ docs: [] }));

        // 3. Consultas Abertas (status == 'open' e professionalId)
        const qConsultas = query(
          collection(db, 'artifacts', APP_ID, 'public', 'data', 'consultations'),
          where('status', '==', 'open'),
          where('professionalId', 'in', profIds)
        );
        const snapConsultas = await getDocs(qConsultas).catch(() => ({ docs: [] }));

        setKpis({
          agendaHoje: snapAgenda.docs.length,
          internadosAtivos: snapInternados.docs.length,
          cirurgiasHoje: 0, // placeholder para cirurgiasHoje
          consultasAbertas: snapConsultas.docs.length
        });

        // Mock das próximas consultas baseado nos agendamentos encontrados
        const consultas = snapAgenda.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => a.time.localeCompare(b.time));
        setProximasConsultas(consultas);

      } catch (err) {
        console.error('Error fetching dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    if (userProfile?.uid) {
      fetchData();
    }
  }, [userProfile]);

  const today = new Date();
  const dateFormatted = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(today);

  return (
    <div className="space-y-8 animate-in fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{t('dashboard.welcome', 'Bom dia')}, Dr(a). {userProfile?.nome.split(' ')[0]}</h1>
        <p className="text-teal-400 font-medium mt-1 capitalize">{dateFormatted}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Agenda', value: kpis.agendaHoje, subtitle: 'hoje', bg: 'bg-teal-500/10 border-teal-500/20 text-teal-400' },
          { label: 'Internados', value: kpis.internadosAtivos, subtitle: 'ativos', bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
          { label: 'Cirurgias', value: kpis.cirurgiasHoje, subtitle: 'hoje', bg: 'bg-purple-500/10 border-purple-500/20 text-purple-400' },
          { label: 'Consultas', value: kpis.consultasAbertas, subtitle: 'abertas', bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
        ].map((kpi, idx) => (
          <div key={idx} className={`p-5 rounded-2xl border ${kpi.bg}`}>
            <h3 className="text-sm font-bold opacity-80 uppercase tracking-wider">{kpi.label}</h3>
            <p className="text-4xl font-black mt-2">{loading ? '-' : kpi.value}</p>
            <p className="text-xs font-bold opacity-60 uppercase mt-1">{kpi.subtitle}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-800/50 border border-white/5 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-teal-400" />
            {t('dashboard.next_appointments', 'Próximas consultas de hoje')}
          </h2>
        </div>
        
        <div className="divide-y divide-white/5">
          {loading ? (
            <div className="p-12 flex justify-center"><div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : proximasConsultas.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-medium">{t('dashboard.no_appointments', 'Nenhum agendamento para hoje.')}</div>
          ) : (
            proximasConsultas.map(consulta => (
              <div key={consulta.id} className="p-4 sm:px-6 hover:bg-white/5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 rounded-xl flex flex-col items-center justify-center border border-white/5">
                    <span className="text-sm font-bold text-white">{consulta.time || '--:--'}</span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                      {consulta.patientName || 'Paciente'} 
                      <span className="text-sm text-slate-500 font-medium">/ {consulta.clientName || 'Cliente'}</span>
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-sm">
                      <span className="text-teal-400 font-medium bg-teal-500/10 px-2 py-0.5 rounded-md">{consulta.serviceName || 'Consulta'}</span>
                      <span className="text-slate-500 flex items-center gap-1">
                        <User className="w-4 h-4" /> Dr(a). {userProfile?.nome}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-teal-500 hover:text-white">
                  {t('common:view')} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MedicalDashboard;
