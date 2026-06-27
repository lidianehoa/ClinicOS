import { useState, useEffect } from 'react';
import { query, where, getDocs } from 'firebase/firestore';
import { APP_ID, Hospitalization, hospitalizationsCol } from '../../services/dataService';
import { Loader2, FileText, Search, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  onOpenSheet: (id: string) => void;
}

const HospitalizationHistory = ({ onOpenSheet }: Props) => {
  const { t } = useTranslation(['medical', 'common']);
  const [data, setData] = useState<Hospitalization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const q = query(hospitalizationsCol(APP_ID), where('status', '==', 'discharged'));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Hospitalization));
        
        list.sort((a, b) => new Date(b.dischargeDate || 0).getTime() - new Date(a.dischargeDate || 0).getTime());
        setData(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const filtered = data.filter(h => 
    h.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    h.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 text-teal-500 animate-spin" /></div>;

  return (
    <div className="h-full flex flex-col space-y-6">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/20 text-teal-400 rounded-xl">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-white font-bold">{t('medical:history.title', 'Histórico de Internações')}</h2>
            <p className="text-slate-400 text-xs">{t('medical:history.subtitle', 'Pacientes que já receberam alta')}</p>
          </div>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input 
            type="text" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            placeholder={t('medical:history.search_placeholder', 'Buscar paciente/tutor...')} 
            className="w-full bg-slate-800 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-white outline-none focus:border-teal-500 text-sm" 
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-900/50 rounded-2xl border border-white/5">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">{t('medical:history.empty', 'Nenhum registro encontrado.')}</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400 bg-slate-800/50 border-b border-white/5">
              <tr>
                <th className="p-4 font-medium">{t('medical:history.discharge_date', 'Data Alta')}</th>
                <th className="p-4 font-medium">{t('medical:history.patient', 'Paciente')}</th>
                <th className="p-4 font-medium">{t('medical:history.owner', 'Tutor')}</th>
                <th className="p-4 font-medium">{t('medical:history.reason', 'Motivo Entrada')}</th>
                <th className="p-4 font-medium">{t('common:actions', 'Ações')}</th>
              </tr>
            </thead>
            <tbody className="text-slate-300 divide-y divide-white/5">
              {filtered.map(h => (
                <tr key={h.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-4 font-mono text-xs">
                    {h.dischargeDate ? new Date(h.dischargeDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-4">
                    <p className="text-white font-medium">{h.patientName}</p>
                    <p className="text-xs text-slate-500">{h.species} {h.breed ? `• ${h.breed}` : ''}</p>
                  </td>
                  <td className="p-4">{h.clientName}</td>
                  <td className="p-4 text-xs max-w-[200px] truncate">{h.admissionReason}</td>
                  <td className="p-4">
                    <button onClick={() => onOpenSheet(h.id)} className="bg-teal-500/10 text-teal-400 hover:bg-teal-500 hover:text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5 opacity-0 group-hover:opacity-100">
                      <FileText className="w-3.5 h-3.5" /> {t('medical:history.view_sheet', 'Ver Ficha')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
};

export default HospitalizationHistory;
