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
} from '../services/dataService';

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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newLog, setNewLog] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
        <h1 className="text-3xl font-bold text-slate-800">CRM Clientes</h1>
        <p className="text-slate-500 mt-1">Relacionamento e anotações por cliente.</p>
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
                placeholder="Buscar cliente ou paciente..."
                className="bg-transparent flex-1 text-sm focus:outline-none text-slate-700 placeholder-slate-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredCustomers.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-8 whitespace-pre-line">
                {customers.length === 0
                  ? 'Nenhum cliente ainda.\nImporte o CSV ou salve\numa movimentação.'
                  : 'Nenhum resultado.'}
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
              <p className="text-sm">Selecione um cliente para ver os detalhes.</p>
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
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>

              {/* Logs de interação */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-purple-50/20">
                {logs.length === 0 && (
                  <p className="text-center text-sm text-slate-400 pt-8">
                    Nenhuma anotação ainda. Registre o primeiro contato!
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
                  placeholder="Registrar anotação ou log de WhatsApp..."
                  className="flex-1 px-4 py-3 bg-purple-50/50 border border-purple-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 text-slate-700 placeholder-slate-400"
                />
                <button
                  onClick={handleSendLog}
                  disabled={sending || !newLog.trim()}
                  className="px-5 py-3 bg-primary text-white rounded-2xl hover:bg-pink-600 transition-colors shadow-sm shadow-primary/30 disabled:opacity-50 flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span className="text-sm font-semibold">Salvar</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CRM;
