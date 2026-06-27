import { useState, useEffect } from 'react';
import { 
  ShieldCheck, Trash2, Calendar, Clock, 
  DollarSign, Activity, AlertTriangle, RefreshCcw,
  ChevronRight, MessageSquare, Send
} from 'lucide-react';
import { 
  subscribeAllDailyFlows, 
  limparDadosDoDia, type AppUser 
} from '../services/dataService';
import { sendDailyReminders } from '../services/reminderService';
import { useTranslation } from 'react-i18next';

const AdminConsole = ({ userProfile: _ }: { userProfile: AppUser | null }) => {
  const { t } = useTranslation(['admin', 'common']);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'logs' | 'notificacoes' | 'ferramentas'>('logs');
  const [processingReminders, setProcessingReminders] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Para simplificar, vamos escutar todos os registros e filtrar pela data selecionada
    const unsubFlow = subscribeAllDailyFlows((flowRecords) => {
      const filtered = flowRecords.filter(r => r._date === selectedDate);
      setLogs(prev => {
        const others = prev.filter(p => !p._isFlow);
        return [...filtered.map(f => ({ ...f, _isFlow: true, timestamp: f._id.split('_')[1] ? new Date(parseInt(f._id.split('_')[1])).toISOString() : new Date().toISOString() })), ...others];
      });
      setLoading(false);
    });

    return () => unsubFlow();
  }, [selectedDate]);

  const handleResetDay = async () => {
    try {
      await limparDadosDoDia(selectedDate);
    } catch (err) {
      console.error(err);
    }
  };

  const fmtCurrency = (val: string) => {
    return parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const sortedLogs = [...logs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-primary" />
            {t('admin:console.title', 'Consola Administrativa')}
          </h1>
          <p className="text-slate-500 font-medium text-sm">{t('admin:console.subtitle', 'Auditoria, logs e gestão crítica do sistema.')}</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <Calendar className="w-4 h-4 text-slate-400 ml-2" />
          <input 
            type="date" 
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 outline-none pr-2"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 w-fit rounded-2xl">
        <button 
          onClick={() => setActiveTab('logs')}
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'logs' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Logs de Atividade
        </button>
        <button 
          onClick={() => setActiveTab('notificacoes')}
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'notificacoes' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Notificações
        </button>
        <button 
          onClick={() => setActiveTab('ferramentas')}
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'ferramentas' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Ferramentas Críticas
        </button>
      </div>

      {activeTab === 'notificacoes' && (
        <div className="bg-white rounded-[32px] p-8 shadow-xl border border-slate-100 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-emerald-500" /> WhatsApp Reminders
              </h3>
              <p className="text-slate-500 text-sm mt-1">Dispare os lembretes de consultas agendadas para o dia seguinte.</p>
            </div>
          </div>

          <div className="p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100 space-y-4 max-w-xl">
             <h4 className="text-sm font-black text-emerald-700 uppercase tracking-widest">Processamento Manual</h4>
             <p className="text-xs text-emerald-600 font-medium leading-relaxed">
               Ao clicar abaixo, o sistema irá buscar todos os agendamentos marcados para amanhã, 
               encontrar os clientes que possuem WhatsApp configurado, e enviar uma mensagem de lembrete em lote.
             </p>
             <button 
               disabled={processingReminders}
               onClick={async () => {
                 setProcessingReminders(true);
                 try {
                   await sendDailyReminders();
                   alert("Processamento concluído. Verifique os logs de notificações.");
                 } catch (err) {
                   console.error(err);
                   alert("Erro ao processar lembretes.");
                 } finally {
                   setProcessingReminders(false);
                 }
               }}
               className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black py-4 px-6 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
             >
               <Send className="w-5 h-5" />
               {processingReminders ? 'PROCESSANDO...' : 'DISPARAR LEMBRETES DE AMANHÃ'}
             </button>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Transações" value={sortedLogs.length.toString()} icon={Activity} color="sky" />
            <StatCard label="Volume Bruto" value={fmtCurrency(sortedLogs.reduce((acc, l) => acc + parseFloat(l.valor || '0'), 0).toString())} icon={DollarSign} color="emerald" />
            <StatCard label="Data em Foco" value={selectedDate.split('-').reverse().join('/')} icon={Calendar} color="violet" />
          </div>

          <div className="bg-white rounded-[32px] shadow-xl border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-slate-800 uppercase tracking-tighter">Timeline de Operações</h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempo Real</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <tr>
                    <th className="px-8 py-4">Horário</th>
                    <th className="px-8 py-4">Operador</th>
                    <th className="px-8 py-4">Evento</th>
                    <th className="px-8 py-4">Valor</th>
                    <th className="px-8 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <RefreshCcw className="w-8 h-8 text-primary animate-spin" />
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sincronizando logs...</p>
                        </div>
                      </td>
                    </tr>
                  ) : sortedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-slate-400">
                        <p className="font-bold uppercase tracking-widest text-sm">Nenhuma atividade registrada para este dia.</p>
                      </td>
                    </tr>
                  ) : sortedLogs.map((log) => (
                    <tr key={log._id} className="group hover:bg-slate-50 transition-all">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-black text-slate-500 group-hover:bg-primary group-hover:text-white transition-colors">
                            {log.operador ? log.operador[0].toUpperCase() : 'U'}
                          </div>
                          <span className="text-sm font-bold text-slate-700">{log.operador || 'Sistema'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <p className="text-sm text-slate-600 font-medium">{log.descricao || log.procedimento || 'Venda PDV'}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{log.pagamento || 'N/A'}</p>
                      </td>
                      <td className="px-8 py-4">
                        <span className="text-sm font-black text-slate-800">{fmtCurrency(log.valor)}</span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <button className="p-2 text-slate-300 hover:text-primary transition-colors">
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ferramentas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-[32px] p-8 shadow-xl border border-slate-100 space-y-6">
            <div className="flex items-center gap-4 text-red-500">
              <div className="p-3 bg-red-50 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg">Zona de Perigo</h3>
                <p className="text-slate-500 text-sm">Ações irreversíveis que afetam o banco de dados.</p>
              </div>
            </div>

            <div className="p-6 bg-red-50/50 rounded-3xl border border-red-100 space-y-4">
              <h4 className="text-sm font-black text-red-700 uppercase tracking-widest">Limpar Dados do Dia</h4>
              <p className="text-xs text-red-600 font-medium leading-relaxed">
                Esta ação apagará permanentemente todos os movimentos de caixa, vendas registradas e lançamentos no monitoramento para a data selecionada ({selectedDate.split('-').reverse().join('/')}).
              </p>
              <button 
                onClick={handleResetDay}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                APAGAR TUDO DESTE DIA
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[32px] p-8 shadow-xl border border-slate-100 space-y-6 flex flex-col justify-center items-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-2">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <h3 className="font-black text-slate-800 uppercase tracking-tighter">Acesso Restrito</h3>
            <p className="text-slate-500 text-sm max-w-[240px]">Apenas a administradora master tem acesso a estas ferramentas de auditoria e limpeza.</p>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color }: any) => {
  const colors: any = {
    sky: 'bg-teal-50 text-teal-600 border-teal-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    violet: 'bg-teal-50 text-teal-600 border-teal-100',
  };
  return (
    <div className={`bg-white p-6 rounded-3xl border ${colors[color]} shadow-sm flex items-center gap-4`}>
      <div className={`p-3 rounded-2xl ${colors[color]} bg-opacity-50`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
        <p className="text-xl font-black">{value}</p>
      </div>
    </div>
  );
};

export default AdminConsole;
