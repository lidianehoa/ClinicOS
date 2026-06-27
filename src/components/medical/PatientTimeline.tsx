import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { APP_ID, TimelineEvent } from '../../services/dataService';
import { Stethoscope, Bed, Syringe, FileText, CheckCircle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  patientId: string;
}

const PatientTimeline = ({ patientId }: Props) => {
  const { t } = useTranslation(['medical', 'common']);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'consultations' | 'vaccines' | 'exams'>('all');

  useEffect(() => {
    const fetchTimeline = async () => {
      setLoading(true);
      try {
        // Parallel fetching
        const [consultationsSnap, hospSnap, surgSnap, recordsSnap] = await Promise.all([
          getDocs(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'consultations'), where('patientId', '==', patientId))),
          getDocs(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'hospitalizations'), where('patientId', '==', patientId))),
          getDocs(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'surgeries'), where('patientId', '==', patientId))),
          getDocs(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'records'), where('patientId', '==', patientId)))
        ]);

        const timeline: TimelineEvent[] = [];

        consultationsSnap.forEach(doc => {
          const data = doc.data();
          timeline.push({
            id: `c_${doc.id}`,
            date: data.date || data.createdAt?.split('T')[0] || '',
            time: data.time || '00:00',
            type: 'consultation',
            title: `${t('medical:consultation.consultation_title', 'Consulta')} — ${data.consultationType || t('medical:consultation.types.general', 'Geral')}`,
            professional: data.professionalName,
            status: data.status === 'completed' ? 'completed' : 'pending',
            referenceId: doc.id,
            referenceCollection: 'consultations'
          });
        });

        hospSnap.forEach(doc => {
          const data = doc.data();
          timeline.push({
            id: `h_${doc.id}`,
            date: data.entryDate || data.createdAt?.split('T')[0] || '',
            type: 'hospitalization',
            title: t('medical:hospitalization.hospitalization', 'Internação'),
            subtitle: data.reason,
            professional: data.professionalName,
            status: data.status === 'discharged' ? 'completed' : 'pending',
            referenceId: doc.id,
            referenceCollection: 'hospitalizations'
          });
        });

        surgSnap.forEach(doc => {
          const data = doc.data();
          timeline.push({
            id: `s_${doc.id}`,
            date: data.date || data.createdAt?.split('T')[0] || '',
            time: data.time || '',
            type: 'surgery',
            title: `${t('medical:surgeries.surgery', 'Cirurgia')} — ${data.procedure}`,
            professional: data.surgeonName,
            status: data.status === 'completed' ? 'completed' : 'pending',
            referenceId: doc.id,
            referenceCollection: 'surgeries'
          });
        });

        recordsSnap.forEach(doc => {
          const data = doc.data();
          // Map records (vaccines, exams, docs)
          let type: TimelineEvent['type'] = 'document';
          if (data.type === 'vaccine') type = 'vaccine';
          else if (data.type === 'exam') type = 'exam';
          
          timeline.push({
            id: `r_${doc.id}`,
            date: data.date || data.createdAt?.split('T')[0] || '',
            type,
            title: data.title || (type === 'vaccine' ? t('medical:vaccines.vaccine', 'Vacina') : t('medical:documents.document', 'Documento')),
            subtitle: data.description,
            professional: data.professionalName,
            status: data.status === 'expired' ? 'expired' : 'completed',
            referenceId: doc.id,
            referenceCollection: 'records'
          });
        });

        // Sort descending
        timeline.sort((a, b) => {
          const dtA = new Date(`${a.date}T${a.time || '00:00:00'}`);
          const dtB = new Date(`${b.date}T${b.time || '00:00:00'}`);
          return dtB.getTime() - dtA.getTime();
        });

        setEvents(timeline);
      } catch (err) {
        console.error('Error fetching timeline:', err);
      } finally {
        setLoading(false);
      }
    };

    if (patientId) fetchTimeline();
  }, [patientId]);

  const filteredEvents = events.filter(e => {
    if (filter === 'all') return true;
    if (filter === 'consultations') return e.type === 'consultation' || e.type === 'hospitalization' || e.type === 'surgery';
    if (filter === 'vaccines') return e.type === 'vaccine';
    if (filter === 'exams') return e.type === 'exam';
    return true;
  });

  const getEventStyle = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'consultation': return { bg: 'bg-teal-100', text: 'text-teal-600', icon: <Stethoscope className="w-4 h-4" /> };
      case 'hospitalization': return { bg: 'bg-blue-100', text: 'text-blue-600', icon: <Bed className="w-4 h-4" /> };
      case 'surgery': return { bg: 'bg-purple-100', text: 'text-purple-600', icon: <Syringe className="w-4 h-4" /> };
      case 'vaccine': return { bg: 'bg-emerald-100', text: 'text-emerald-600', icon: <Syringe className="w-4 h-4" /> };
      case 'exam': return { bg: 'bg-amber-100', text: 'text-amber-600', icon: <FileText className="w-4 h-4" /> };
      default: return { bg: 'bg-slate-100', text: 'text-slate-600', icon: <FileText className="w-4 h-4" /> };
    }
  };

  return (
    <div className="bg-slate-800 border border-white/5 rounded-2xl flex flex-col h-full overflow-hidden">
      
      <div className="p-4 border-b border-white/5 bg-slate-900/50">
        <h2 className="text-white font-bold mb-3">{t('medical:timeline.patient_history', 'Histórico do Paciente')}</h2>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{t('common:all', 'Todos')}</button>
          <button onClick={() => setFilter('consultations')} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${filter === 'consultations' ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{t('medical:timeline.consultations', 'Atendimentos')}</button>
          <button onClick={() => setFilter('vaccines')} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${filter === 'vaccines' ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{t('medical:timeline.vaccines', 'Vacinas')}</button>
          <button onClick={() => setFilter('exams')} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${filter === 'exams' ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{t('medical:timeline.exams', 'Exames')}</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {loading ? (
          <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : filteredEvents.length === 0 ? (
          <p className="text-center text-slate-500 text-sm mt-8">{t('medical:timeline.no_history', 'Nenhum histórico encontrado.')}</p>
        ) : (
          <div className="relative border-l-2 border-teal-200 ml-3 space-y-6">
            {filteredEvents.map(event => {
              const [, m, d] = (event.date || '').split('-');
              const dateStr = d ? `${d}/${m}` : '';
              
              return (
                <div key={event.id} className="relative pl-6">
                  {/* Timeline Dot */}
                  <div className={`absolute -left-3.5 top-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white ${getEventStyle(event.type).bg} ${getEventStyle(event.type).text}`}>
                    {getEventStyle(event.type).icon}
                  </div>
                  
                  {/* Content */}
                  <div className="bg-slate-900/50 border border-slate-700 hover:border-teal-400 rounded-xl p-3 transition-colors group cursor-pointer">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-white font-bold text-sm leading-tight group-hover:text-teal-400 transition-colors">
                        {event.title}
                      </h4>
                      <span className="text-xs font-medium text-slate-500 shrink-0 whitespace-nowrap">
                        {dateStr} {event.time && `${t('common:at', 'às')} ${event.time}`}
                      </span>
                    </div>
                    
                    {event.subtitle && <p className="text-slate-400 text-xs mb-2 line-clamp-2">{event.subtitle}</p>}
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5">
                        {event.status === 'completed' && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                        {event.status === 'pending' && <Clock className="w-3 h-3 text-amber-500" />}
                        {event.status === 'expired' && <span className="w-2 h-2 rounded-full bg-red-500" />}
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                          {event.status === 'completed' ? t('common:status.completed', 'Concluído') : event.status === 'pending' ? t('common:status.in_progress', 'Em andamento') : event.status === 'expired' ? t('common:status.expired', 'Vencida') : t('common:status.registered', 'Registrado')}
                        </span>
                      </div>
                      {event.professional && <span className="text-xs text-slate-500 font-medium">Dr(a). {event.professional.split(' ')[0]}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientTimeline;
