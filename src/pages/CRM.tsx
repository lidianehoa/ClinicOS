import { useState, useEffect, useRef } from 'react';
import { User, MessageCircle, Send, Search } from 'lucide-react';
import {
  searchCustomers,
  subscribeInteractions,
  addInteraction,
  getCustomer,
  type Customer,
  type LogEntry,
  type AppUser,
  subscribeAppointments,
  type Appointment,
  subscribeMedicalRecords,
  type MedicalRecord
} from '../services/dataService';
import ProntuarioModal from '../components/ProntuarioModal';
import { useTranslation } from 'react-i18next';

interface CRMProps {
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  userProfile: AppUser | null;
}

// Normaliza nome para comparação (igual ao toCustomerId do Monitoramento)
const normalizeId = (nome: string) =>
  nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 80);

const CRM = ({ selectedCustomerId, setSelectedCustomerId, userProfile }: CRMProps) => {
  const { t } = useTranslation(['crm', 'common']);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newLog, setNewLog] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [crmTab, setCrmTab] = useState<'anotacoes'|'prontuarios'>('anotacoes');
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);

  useEffect(() => {
    return subscribeAppointments(setAppointments);
  }, []);

  useEffect(() => {
    if (!selectedCustomerId) { setRecords([]); return; }
    return subscribeMedicalRecords(selectedCustomerId, setRecords);
  }, [selectedCustomerId]);

  useEffect(() => {
    // Busca inicial (vazia ou top 10)
    const init = async () => {
      const results = await searchCustomers('');
      setCustomers(results);
    };
    init();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        const results = await searchCustomers(searchTerm);
        setCustomers(results);
      } else if (searchTerm.length === 0) {
        const results = await searchCustomers('');
        setCustomers(results);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Quando a lista de clientes carregar e houver um ID selecionado que não bate
  // com nenhum documento real (ex.: slug gerado pelo Monitoramento), tenta resolver
  // pelo nome normalizado e corrige o ID para o documento real do Firestore.
  useEffect(() => {
    if (!selectedCustomerId || customers.length === 0) return;
    const exactMatch = customers.find(c => c.id === selectedCustomerId);
    if (!exactMatch) {
      const byName = customers.find(
        c => normalizeId(c.nome) === selectedCustomerId
      );
      if (byName) {
        setSelectedCustomerId(byName.id);
      }
    }
  }, [customers, selectedCustomerId, setSelectedCustomerId]);

  // Se o ID selecionado não estiver na lista (ex: veio do Monitoramento), busca ele
  useEffect(() => {
    if (!selectedCustomerId) return;
    const exists = customers.some(c => c.id === selectedCustomerId);
    if (!exists) {
      getCustomer(selectedCustomerId).then((c: Customer | null) => {
        if (c) {
          setCustomers(prev => [...prev, c]);
        } else {
          // Se não achou pelo ID exato (slug), tenta buscar pelo nome se for um slug
          // No CRM, o searchCustomers('') já traz os top 10.
          // Talvez devêssemos fazer uma busca por prefixo aqui se não acharmos o ID.
        }
      });
    }
  }, [selectedCustomerId, customers]);

  useEffect(() => {
    if (!selectedCustomerId) { setLogs([]); return; }
    return subscribeInteractions(selectedCustomerId, setLogs);
  }, [selectedCustomerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const filteredCustomers = customers;

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  
  const upcomingApts = appointments.filter(a => 
    a.clientId === selectedCustomerId && 
    a.date >= new Date().toISOString().substring(0, 10) &&
    a.status !== 'cancelled'
  ).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  const handleSendLog = async () => {
    if (!newLog.trim() || !selectedCustomerId) return;
    setSending(true);
    try {
      await addInteraction(selectedCustomerId, { 
        texto: newLog.trim(), 
        autor: userProfile?.nome || 'Recepção' 
      });
      setNewLog('');
    } finally {
      setSending(false);
    }
  };

  const fmt = (ts: string | undefined | null) =>
    ts ? new Date(ts).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';

  return (
    <div className="flex flex-col space-y-4 animate-fade-in pb-10" style={{ height: 'calc(100vh - 4rem)' }}>
      <header>
        <h1 className="text-3xl font-bold text-slate-800">{t('crm:title', 'CRM Clientes')}</h1>
        <p className="text-slate-500 mt-1">{t('crm:subtitle', 'Relacionamento e anotações por cliente.')}</p>
      </header>

      <div className="flex-1 grid grid-cols-12 gap-5 min-h-0">

        {/* ── Lista de clientes ─────────────────────────────────────── */}
        <div className="col-span-12 md:col-span-3 bg-white rounded-3xl shadow-sm border border-purple-100 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-purple-50">
            <div className="flex items-center space-x-2 bg-purple-50/60 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={t('crm:search_placeholder', 'Buscar cliente ou paciente...')}
                className="bg-transparent flex-1 text-sm focus:outline-none text-slate-700 placeholder-slate-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredCustomers.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-8 whitespace-pre-line">
                {customers.length === 0
                  ? t('crm:empty_customers', 'Nenhum cliente ainda.\nImporte o CSV ou salve\numa movimentação.')
                  : t('crm:empty_search', 'Nenhum resultado.')}
              </p>
            )}
            {filteredCustomers.map(c => {
              const isActive = c.id === selectedCustomerId;
              // Pega o nome do primeiro animal (do array animais ou do campo legado)
              const animalNome = (c as any).animais?.[0]?.nome || c.animal || '';
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`w-full text-left p-3 rounded-2xl flex items-center space-x-3 transition-all duration-150 ${
                    isActive
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-purple-50/50 border border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${isActive ? 'bg-primary/20 text-primary' : 'bg-purple-100 text-secondary'}`}>
                    {c.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{c.nome}</p>
                    {animalNome && <p className="text-xs text-slate-500 truncate">🩺 {animalNome}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Painel de detalhes ────────────────────────────────────── */}
        <div className="col-span-12 md:col-span-9 bg-white rounded-3xl shadow-sm border border-purple-100 flex flex-col overflow-hidden">
          {!selectedCustomer ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <User className="w-12 h-12 text-purple-200" />
              <p className="text-sm">{t('crm:select_prompt', 'Selecione um cliente para ver os detalhes.')}</p>
            </div>
          ) : (
            <>
              {/* Cabeçalho do cliente — apenas o essencial */}
              <div className="px-6 py-4 border-b border-purple-50 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{selectedCustomer.nome}</h2>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {/* Múltiplos animais (CSV clientes) ou campo legado (movimentação) */}
                    {(selectedCustomer as any).animais?.length > 0
                      ? (selectedCustomer as any).animais.map((a: any, i: number) => (
                        <span key={i} className="text-xs bg-purple-50 border border-purple-100 text-secondary px-2 py-0.5 rounded-full">
                          🩺 {a.nome}
                        </span>
                      ))
                      : selectedCustomer.animal && (
                        <span className="text-xs bg-purple-50 border border-purple-100 text-secondary px-2 py-0.5 rounded-full">
                          🩺 {selectedCustomer.animal}
                        </span>
                      )
                    }
                  </div>
                  {selectedCustomer.telefone && (
                    <p className="text-xs text-slate-500 mt-1">📞 {selectedCustomer.telefone}</p>
                  )}
                </div>

                {selectedCustomer.telefone && (
                  <a
                    href={`https://wa.me/55${selectedCustomer.telefone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-4 py-2 bg-emerald-50 text-emerald-700 font-semibold rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-200 text-sm flex-shrink-0"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{t('crm:btn_whatsapp', 'WhatsApp')}</span>
                  </a>
                )}
              </div>

              {/* Próximos Agendamentos */}
              {upcomingApts.length > 0 && (
                <div className="px-6 py-4 border-b border-purple-50 bg-slate-50/50">
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">{t('crm:upcoming_appointments', 'Próximos Agendamentos')}</h3>
                  <div className="space-y-2">
                    {upcomingApts.map(apt => (
                      <div key={apt.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{apt.serviceName}</p>
                          <p className="text-xs font-medium text-slate-500">
                            {apt.date.split('-').reverse().join('/')} às {apt.startTime} - Paciente: {apt.patientName}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${apt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                          {apt.status === 'confirmed' ? 'Confirmado' : 'Agendado'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="flex border-b border-purple-100 mt-2 px-6">
                <button onClick={() => setCrmTab('anotacoes')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${crmTab === 'anotacoes' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>{t('crm:tab_notes', 'Anotações')}</button>
                <button onClick={() => setCrmTab('prontuarios')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${crmTab === 'prontuarios' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>{t('crm:tab_records', 'Prontuários')}</button>
              </div>

              {crmTab === 'anotacoes' && (
                <>
                  {/* Logs de interação */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-purple-50/20">
                    {logs.length === 0 && (
                      <p className="text-center text-sm text-slate-400 pt-8">
                        {t('crm:empty_notes', 'Nenhuma anotação ainda. Registre o primeiro contato!')}
                      </p>
                    )}
                    {logs.map(log => {
                      const isRec = log.autor === 'Recepção';
                      return (
                        <div key={log.id} className={`flex flex-col ${isRec ? 'items-start' : 'items-end'}`}>
                          <span className="text-xs text-slate-400 mb-1">
                            {log.autor} · {fmt(log.timestamp)}
                          </span>
                          <div className="px-4 py-3 rounded-2xl max-w-2xl text-sm shadow-sm bg-white border border-slate-100 text-slate-700">
                            {log.texto}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>

                  {/* Input de nova anotação */}
                  <div className="p-4 border-t border-purple-50 flex gap-3">
                    <input
                      type="text"
                      value={newLog}
                      onChange={e => setNewLog(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendLog()}
                      placeholder={t('crm:notes_placeholder', 'Registrar anotação ou log de WhatsApp...')}
                      className="flex-1 px-4 py-3 bg-purple-50/50 border border-purple-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 text-slate-700 placeholder-slate-400"
                    />
                    <button
                      onClick={handleSendLog}
                      disabled={sending || !newLog.trim()}
                      className="px-5 py-3 bg-primary text-white rounded-2xl hover:bg-pink-600 transition-colors shadow-sm shadow-primary/30 disabled:opacity-50 flex items-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span className="text-sm font-semibold">{t('crm:btn_save', 'Salvar')}</span>
                    </button>
                  </div>
                </>
              )}

              {crmTab === 'prontuarios' && (
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
                  {/* Histórico Rápido */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-6 text-sm">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{t('crm:total_appointments', 'Total de Consultas')}</p>
                      <p className="font-bold text-slate-700">{records.length}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{t('crm:last_appointment', 'Último Atendimento')}</p>
                      <p className="font-bold text-slate-700">{records.length > 0 ? records[0].date.split('-').reverse().join('/') : t('crm:none', 'Nenhum')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{t('crm:next_return', 'Próximo Retorno')}</p>
                      <p className="font-bold text-slate-700">{records.find(r => r.returnDate && r.returnDate >= new Date().toISOString().substring(0,10))?.returnDate?.split('-').reverse().join('/') || t('crm:none', 'Nenhum')}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-700">{t('crm:records_history', 'Histórico de Prontuários')}</h3>
                  </div>

                  <div className="space-y-3">
                    {records.map(rec => (
                      <div key={rec.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                        <div>
                           <p className="text-sm font-bold text-slate-800">{rec.date.split('-').reverse().join('/')} - {rec.diagnosis || t('crm:no_diagnosis', 'Sem diagnóstico')}</p>
                           <p className="text-xs text-slate-500 line-clamp-1">{rec.chiefComplaint}</p>
                           <p className="text-[10px] text-slate-400 mt-1">Dr(a) {rec.professionalName}</p>
                        </div>
                        <button onClick={() => setSelectedRecord(rec)} className="px-4 py-2 bg-indigo-50 text-indigo-600 font-bold text-sm rounded-xl hover:bg-indigo-100">{t('crm:btn_view_record', 'Ver Prontuário')}</button>
                      </div>
                    ))}
                    {records.length === 0 && (
                      <p className="text-center text-slate-400 py-8 text-sm">{t('crm:empty_records', 'Nenhum prontuário registrado para este paciente.')}</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {selectedRecord && (
        <ProntuarioModal 
          initialRecord={selectedRecord} 
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
};

export default CRM;
