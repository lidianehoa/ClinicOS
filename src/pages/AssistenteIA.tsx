import { useState, useMemo, useEffect } from 'react';
import { Bot, MessageCircle, TrendingUp, Send, Copy, Check, Sparkles } from 'lucide-react';
import { subscribeAllDailyFlows, subscribeAllDespesas, toLocalDateString, canDelete, type Registro, type Despesa, type AppUser } from '../services/dataService';
import { callGemini, SYSTEM_PROMPT } from '../services/aiService';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type AbaIA = 'mensagens' | 'financeiro';
type TipoMensagem = 'retorno' | 'cobranca' | 'aniversario' | 'agendamento' | 'livre';
interface ChatMsg { role: 'user' | 'ai'; content: string; }

const TIPOS: { id: TipoMensagem; label: string; emoji: string; desc: string }[] = [
  { id: 'retorno',      label: 'Pós-consulta',  emoji: '🐾', desc: 'Acompanhamento após atendimento' },
  { id: 'cobranca',    label: 'Cobrança',       emoji: '💳', desc: 'Pagamento pendente (amigável)' },
  { id: 'aniversario', label: 'Aniversário',    emoji: '🎂', desc: 'Felicitar aniversário do paciente' },
  { id: 'agendamento', label: 'Agendamento',    emoji: '📅', desc: 'Confirmação ou lembrete' },
  { id: 'livre',       label: 'Livre',          emoji: '✏️',  desc: 'Mensagem personalizada' },
];

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pf  = (v: any)   => parseFloat(String(v || '0').replace(',', '.'));

// ─── Componente ───────────────────────────────────────────────────────────────

const AssistenteIA = ({ userProfile }: { userProfile: AppUser | null }) => {
  const [aba, setAba] = useState<AbaIA>('mensagens');
  const [loading, setLoading] = useState(false);

  // Dados financeiros
  const [allRecords, setAllRecords]   = useState<Registro[]>([]);
  const [allDespesas, setAllDespesas] = useState<Despesa[]>([]);
  useEffect(() => {
    const u1 = subscribeAllDailyFlows(setAllRecords);
    const u2 = subscribeAllDespesas(setAllDespesas);
    return () => { u1(); u2(); };
  }, []);

  const mesAtual = toLocalDateString(new Date()).substring(0, 7);
  const kpisCtx = useMemo(() => {
    const mr = allRecords.filter(r => r._date?.startsWith(mesAtual));
    const md = allDespesas.filter(d => d._date?.startsWith(mesAtual));
    const fat = mr.reduce((s, r) => s + pf(r.valor), 0);
    const desp = md.reduce((s, d) => s + pf(d.valor), 0);
    const wAgo = new Date(); wAgo.setDate(wAgo.getDate() - 7);
    const wStr = toLocalDateString(wAgo);
    const wr = allRecords.filter(r => r._date && r._date >= wStr);
    const wd = allDespesas.filter(d => d._date && d._date >= wStr);
    return {
      fat, desp, saldo: fat - desp,
      ticket: mr.length > 0 ? fat / mr.length : 0,
      fatSem: wr.reduce((s, r) => s + pf(r.valor), 0),
      despSem: wd.reduce((s, d) => s + pf(d.valor), 0),
      mes: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      total: allRecords.length,
    };
  }, [allRecords, allDespesas, mesAtual]);

  // ── Aba Mensagens ──────────────────────────────────────────────────────────
  const [tipo, setTipo]         = useState<TipoMensagem>('retorno');
  const [nome, setNome]         = useState('');
  const [animal, setAnimal]     = useState('');
  const [proc, setProc]         = useState('');
  const [instrucao, setInstrucao] = useState('');
  const [resultado, setResultado] = useState('');
  const [copied, setCopied]     = useState(false);

  const gerarMensagem = async () => {
    if (!nome.trim()) return;
    setLoading(true); setResultado('');
    const tipoDesc: Record<TipoMensagem, string> = {
      retorno: 'mensagem de acompanhamento pós-consulta',
      cobranca: 'cobrança amigável de pagamento em aberto',
      aniversario: 'felicitação de aniversário do paciente',
      agendamento: 'confirmação ou lembrete de agendamento',
      livre: instrucao || 'mensagem personalizada',
    };
    const prompt = `Crie uma ${tipoDesc[tipo]} para o cliente "${nome}"${animal ? `, cujo paciente se chama "${animal}"` : ''}${proc ? `. Último procedimento: ${proc}` : ''}${instrucao && tipo === 'livre' ? `. Instrução: ${instrucao}` : ''}.

Regras: Tom caloroso e profissional. Máximo 3 parágrafos. Pronto para WhatsApp (sem markdown). Assine como "Equipe ClinicOS".`;
    try {
      const text = await callGemini([{ role: 'user', parts: [{ text: prompt }] }], SYSTEM_PROMPT);
      setResultado(text);
    } catch (e: any) {
      setResultado(`❌ Erro: ${e.message}`);
    } finally { setLoading(false); }
  };

  const copiar = () => { navigator.clipboard.writeText(resultado); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  // ── Aba Financeiro ─────────────────────────────────────────────────────────
  const [pergunta, setPergunta]   = useState('');
  const [chat, setChat]           = useState<ChatMsg[]>([]);

  const perguntar = async () => {
    if (!pergunta.trim()) return;
    const q = pergunta.trim();
    setPergunta('');
    setChat(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    const ctx = `Dados financeiros da clínica (${kpisCtx.mes}): Faturamento: ${fmt(kpisCtx.fat)} | Despesas: ${fmt(kpisCtx.desp)} | Saldo: ${fmt(kpisCtx.saldo)} | Ticket médio: ${fmt(kpisCtx.ticket)} | Faturamento 7d: ${fmt(kpisCtx.fatSem)} | Despesas 7d: ${fmt(kpisCtx.despSem)}`;
    const prompt = `${ctx}\n\nPergunta do gestor: "${q}"\n\nResponda de forma direta e objetiva usando os dados fornecidos.`;
    try {
      const text = await callGemini([{ role: 'user', parts: [{ text: prompt }] }], SYSTEM_PROMPT);
      setChat(prev => [...prev, { role: 'ai', content: text }]);
    } catch (e: any) {
      setChat(prev => [...prev, { role: 'ai', content: `❌ Erro: ${e.message}` }]);
    } finally { setLoading(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <header className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
          <Bot className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Dra. Elisa</h1>
          <p className="text-slate-500 mt-0.5">Assistente IA · Gemini 2.5 Flash · ClinicOS</p>
        </div>
      </header>

      {/* Abas */}
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-purple-100 w-fit shadow-sm">
        <button onClick={() => setAba('mensagens')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${aba === 'mensagens' ? 'bg-primary text-white shadow-md shadow-primary/30' : 'text-slate-500 hover:text-slate-700'}`}>
          <MessageCircle className="w-4 h-4" />Mensagens para Clientes
        </button>
        
        {canDelete(userProfile?.role) && (
          <button onClick={() => setAba('financeiro')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${aba === 'financeiro' ? 'bg-primary text-white shadow-md shadow-primary/30' : 'text-slate-500 hover:text-slate-700'}`}>
            <TrendingUp className="w-4 h-4" />Consultoria Financeira
          </button>
        )}
      </div>

      {/* ── ABA MENSAGENS ─────────────────────────────────────────────────── */}
      {aba === 'mensagens' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl shadow-sm border border-purple-100 p-6 space-y-5">
            <h2 className="font-semibold text-slate-700 text-lg flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" />Configure a mensagem
            </h2>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Tipo</label>
              <div className="grid grid-cols-2 gap-2">
                {TIPOS.map(t => (
                  <button key={t.id} onClick={() => setTipo(t.id)}
                    className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${tipo === t.id ? 'border-violet-400 bg-violet-50 text-violet-700 font-semibold' : 'border-slate-200 text-slate-600 hover:border-violet-200'}`}>
                    <span className="mr-1.5">{t.emoji}</span>{t.label}
                    <span className="block text-[10px] text-slate-400 mt-0.5">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Nome do cliente *</label>
              <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Maria Silva"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Nome do paciente</label>
                <input value={animal} onChange={e => setAnimal(e.target.value)} placeholder="Ex: Paciente A"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Procedimento</label>
                <input value={proc} onChange={e => setProc(e.target.value)} placeholder="Ex: Consulta clínica"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400" />
              </div>
            </div>
            {tipo === 'livre' && (
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Instrução</label>
                <textarea value={instrucao} onChange={e => setInstrucao(e.target.value)} rows={3} placeholder="Descreva o que quer comunicar..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none" />
              </div>
            )}
            <button onClick={gerarMensagem} disabled={loading || !nome.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold rounded-2xl hover:opacity-90 transition-opacity shadow-lg shadow-violet-200 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Gerando...</> : <><Sparkles className="w-4 h-4" />Gerar Mensagem</>}
            </button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-purple-100 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-700 text-lg">Mensagem gerada</h2>
              {resultado && (
                <button onClick={copiar} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-lg hover:bg-emerald-100 transition-colors">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              )}
            </div>
            {resultado ? (
              <div className="flex-1 bg-slate-50 rounded-2xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap border border-slate-100">{resultado}</div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 gap-3">
                <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-violet-300" />
                </div>
                <p className="text-sm">Preencha os dados ao lado<br />e clique em "Gerar Mensagem"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ABA FINANCEIRO ────────────────────────────────────────────────── */}
      {aba === 'financeiro' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-violet-500" />Dados enviados à IA
            </h2>
            {[
              ['Faturamento mês', fmt(kpisCtx.fat), 'emerald'],
              ['Despesas mês',    fmt(kpisCtx.desp),  'red'],
              ['Saldo real',      fmt(kpisCtx.saldo),  kpisCtx.saldo >= 0 ? 'violet' : 'red'],
              ['Ticket médio',    fmt(kpisCtx.ticket), 'slate'],
              ['Faturamento 7d',  fmt(kpisCtx.fatSem), 'emerald'],
              ['Despesas 7d',     fmt(kpisCtx.despSem),'red'],
            ].map(([label, value, color]) => (
              <div key={label as string} className="bg-white rounded-2xl border border-purple-100 px-4 py-3 flex items-center justify-between shadow-sm">
                <span className="text-xs text-slate-500 font-medium">{label}</span>
                <span className={`text-sm font-bold text-${color}-600`}>{value}</span>
              </div>
            ))}
            <p className="text-[10px] text-slate-400 text-center">{kpisCtx.mes} · {kpisCtx.total} registros</p>
          </div>

          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-purple-100 flex flex-col" style={{ minHeight: 500 }}>
            <div className="px-6 py-4 border-b border-purple-50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-700 text-sm">Dra. Elisa — Consultora Financeira</p>
                <p className="text-[10px] text-slate-400">Gemini 2.5 Flash · Contexto do mês atual</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {chat.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 gap-3 py-12">
                  <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
                    <TrendingUp className="w-8 h-8 text-violet-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">Pergunte sobre as finanças da clínica</p>
                  <div className="flex flex-wrap gap-2 justify-center mt-1">
                    {['Qual meu lucro bruto este mês?', 'Como está meu ticket médio?', 'As despesas estão sob controle?'].map(q => (
                      <button key={q} onClick={() => { setPergunta(q); }}
                        className="text-xs px-3 py-1.5 bg-violet-50 text-violet-600 rounded-full border border-violet-100 hover:bg-violet-100 transition-colors">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chat.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-primary text-white rounded-tr-sm' : 'bg-violet-50 text-slate-700 rounded-tl-sm border border-violet-100'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-violet-50 border border-violet-100 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                    {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}
                    <span className="text-xs text-violet-500 ml-1">Analisando...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-purple-50">
              <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-2 border border-slate-200 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/10 transition-all">
                <input value={pergunta} onChange={e => setPergunta(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !loading && perguntar()}
                  placeholder="Pergunte sobre as finanças da clínica..."
                  className="flex-1 bg-transparent text-sm text-slate-700 focus:outline-none placeholder-slate-400" />
                <button onClick={perguntar} disabled={loading || !pergunta.trim()}
                  className="w-8 h-8 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-pink-600 transition-colors disabled:opacity-40">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssistenteIA;
