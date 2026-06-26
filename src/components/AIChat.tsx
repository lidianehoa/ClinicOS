import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Paperclip, Trash2, FileText, Loader2, ChevronDown, Sparkles } from 'lucide-react';
import { callGemini, SYSTEM_PROMPT, type GeminiMessage } from '../services/aiService';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PDFDoc { name: string; base64: string; size: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const makeId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const formatText = (text: string) =>
  text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/━+/g, '<hr style="border:none;border-top:1px solid #e9d5ff;margin:8px 0"/>')
    .replace(/\n/g, '<br/>');

const QUICK_SUGGESTIONS = [
  'Como calcular o preço de uma consulta?',
  'Script para cliente que achou caro',
  'Cliente ameaçando ir ao Reclame Aqui',
  'Calcular a hora clínica da clínica',
  'Script de follow-up dia 2',
  'Como comunicar óbito ao cliente?',
  'Cliente agressivo no WhatsApp',
  'Quando escalar para o supervisor?',
];

const WELCOME_MSG: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Olá! 👋 Sou a **Dra. Elisa**, assistente do **ClinicOS**.\n\nEstou treinada com os materiais sobre:\n📊 **Finanças e precificação** (Markup Divisor, Hora Clínica, Glosa Interna)\n💬 **Scripts ClinicOS** (WhatsApp, follow-up, fechamento)\n😤 **Clientes difíceis** (insatisfeitos, agressivos, objeção de preço)\n\nPode me fazer uma pergunta ou usar uma das sugestões abaixo. Se quiser complementar com seus próprios PDFs, clique no 📎.',
  timestamp: new Date(),
};

// ─── Componente ───────────────────────────────────────────────────────────────

const AIChat = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pdfs, setPdfs] = useState<PDFDoc[]>([]);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { if (open) scrollToBottom(); }, [messages, open, scrollToBottom]);

  const handleScroll = () => {
    const el = scrollAreaRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
  };

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  // ── Upload PDF ─────────────────────────────────────────────────────────────

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const newPdfs: PDFDoc[] = [];
    for (const file of files) {
      if (file.type !== 'application/pdf') continue;
      if (file.size > 10 * 1024 * 1024) { alert(`${file.name} é muito grande (máx 10MB).`); continue; }
      const base64 = await fileToBase64(file);
      newPdfs.push({ name: file.name, base64, size: file.size });
    }
    setPdfs(prev => {
      const existing = new Set(prev.map(p => p.name));
      return [...prev, ...newPdfs.filter(p => !existing.has(p.name))];
    });
    if (newPdfs.length > 0) {
      setMessages(prev => [...prev, {
        id: makeId(), role: 'assistant',
        content: `📄 **${newPdfs.map(p => p.name).join(', ')}** carregado! Pode perguntar.`,
        timestamp: new Date(),
      }]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Enviar mensagem (Gemini) ───────────────────────────────────────────────

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    setShowSuggestions(false);
    const userMsg: Message = { id: makeId(), role: 'user', content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    
    const isChatSnippet = msg.length > 150 || (msg.match(/\n/g) || []).length >= 2;
    setIsAnalyzing(isChatSnippet);
    setLoading(true);

    try {
      const history = [...messages, userMsg].filter(m => m.id !== 'welcome');

      const contents: GeminiMessage[] = history.map((m, idx) => {
        const isLast = idx === history.length - 1;
        const parts: GeminiMessage['parts'] = [];

        if (isLast && m.role === 'user') {
          for (const pdf of pdfs) {
            parts.push({ inlineData: { mimeType: 'application/pdf', data: pdf.base64 } });
          }
        }
        parts.push({ text: m.content });

        return { role: m.role === 'user' ? 'user' : 'model', parts };
      });

      const reply = await callGemini(contents, SYSTEM_PROMPT);
      setMessages(prev => [...prev, { id: makeId(), role: 'assistant', content: reply, timestamp: new Date() }]);
    } catch (err: any) {
      console.error('AIChat error:', err);
      const isConnectionError = err instanceof TypeError && err.message.includes('fetch');
      const displayMsg = isConnectionError
        ? '🌐 Sem conexão com a API. Verifique a sua ligação à internet e se a chave API está ativa no Google Cloud Console.'
        : (err.message ?? 'Erro desconhecido. Tente novamente.');
      setMessages(prev => [...prev, {
        id: makeId(), role: 'assistant',
        content: `${displayMsg}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      setIsAnalyzing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleClear = () => {
    setMessages([{ ...WELCOME_MSG, id: 'welcome', timestamp: new Date() }]);
    setPdfs([]);
    setShowSuggestions(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl transition-all duration-300 ${
          open ? 'bg-slate-700 text-white' : 'bg-primary text-white shadow-primary/40 hover:bg-pink-600 hover:scale-105'
        }`}
      >
        {open ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
        <span className="text-sm font-semibold hidden sm:inline">{open ? 'Fechar' : 'Dra. Elisa'}</span>
        {!open && messages.length > 1 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-emerald-400 rounded-full text-xs font-bold flex items-center justify-center text-white">
            {messages.filter(m => m.role === 'assistant').length}
          </span>
        )}
      </button>

      {/* Painel */}
      <div
        className={`fixed bottom-20 right-6 z-50 flex flex-col bg-white rounded-3xl shadow-2xl shadow-slate-300/50 border border-purple-100 transition-all duration-300 origin-bottom-right ${
          open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
        }`}
        style={{ width: 'min(440px, calc(100vw - 2rem))', height: 'min(620px, calc(100vh - 8rem))' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-purple-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">Dra. Elisa</p>
              <p className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Gemini 2.5 Flash · Finanças · Scripts · Crise
              </p>
            </div>
          </div>
          {pdfs.length > 0 && (
            <div className="flex items-center gap-1 bg-purple-50 px-3 py-1.5 rounded-xl">
              <FileText className="w-3.5 h-3.5 text-secondary" />
              <span className="text-xs font-semibold text-secondary">+{pdfs.length} PDF{pdfs.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* PDFs carregados */}
        {pdfs.length > 0 && (
          <div className="px-4 pt-2 pb-1 flex flex-wrap gap-1.5 flex-shrink-0 border-b border-purple-50">
            {pdfs.map(p => (
              <div key={p.name} className="flex items-center gap-1 bg-purple-50 border border-purple-100 rounded-lg px-2 py-1 text-xs text-slate-600 max-w-[180px]">
                <FileText className="w-3 h-3 text-secondary flex-shrink-0" />
                <span className="truncate">{p.name}</span>
                <button onClick={() => setPdfs(prev => prev.filter(x => x.name !== p.name))} className="text-slate-400 hover:text-red-400 flex-shrink-0 ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Mensagens */}
        <div ref={scrollAreaRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
          {messages.map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-xs text-slate-400">Dra. Elisa</span>
                </div>
              )}
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-[90%] ${
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-tr-sm shadow-sm shadow-primary/20'
                    : 'bg-purple-50 border border-purple-100 text-slate-700 rounded-tl-sm'
                }`}
                dangerouslySetInnerHTML={{ __html: formatText(msg.content) }}
              />
              <span className="text-[10px] text-slate-400 mt-1 px-1">
                {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}

          {showSuggestions && messages.length === 1 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 font-medium px-1">Perguntas frequentes:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => sendMessage(s)}
                    className="text-xs px-3 py-1.5 bg-white border border-purple-100 text-secondary rounded-xl hover:bg-purple-50 transition-colors text-left">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-3 h-3 text-primary" />
              </div>
              <div className="bg-purple-50 border border-purple-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                <div className="flex flex-col gap-2">
                  {isAnalyzing && (
                    <span className="text-[11px] text-secondary font-semibold animate-pulse flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      Dra. Elisa está a analisar o histórico...
                    </span>
                  )}
                  <div className="flex gap-1 items-center h-2">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-secondary/60 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {showScrollBtn && (
          <button onClick={scrollToBottom} className="absolute bottom-20 right-4 w-8 h-8 bg-white border border-purple-100 rounded-full shadow-md flex items-center justify-center text-slate-500 hover:text-primary z-10">
            <ChevronDown className="w-4 h-4" />
          </button>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-purple-50 flex-shrink-0">
          <div className="flex items-end gap-2 bg-purple-50/60 border border-purple-100 rounded-2xl px-3 py-2">
            <button onClick={() => fileInputRef.current?.click()} title="Anexar PDF"
              className="flex-shrink-0 p-1.5 text-slate-400 hover:text-secondary transition-colors rounded-lg hover:bg-purple-100">
              <Paperclip className="w-4 h-4" />
            </button>
            <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre finanças, scripts ou atendimento..." rows={1}
              className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none resize-none leading-relaxed py-1"
              style={{ minHeight: '24px', maxHeight: '120px' }}
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
              className="flex-shrink-0 p-2 bg-primary text-white rounded-xl hover:bg-pink-600 transition-colors disabled:opacity-40 shadow-sm shadow-primary/30">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            <p className="text-[10px] text-slate-400">Enter para enviar · Shift+Enter nova linha</p>
            <button onClick={handleClear} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-400 transition-colors">
              <Trash2 className="w-3 h-3" /> Limpar
            </button>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="application/pdf" multiple className="hidden" onChange={handlePDFUpload} />
      </div>

      {open && <div className="fixed inset-0 bg-black/10 z-40 sm:hidden" onClick={() => setOpen(false)} />}
    </>
  );
};

export default AIChat;
