import { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart, Search, Trash2, Plus, Minus, Check, X,
  Receipt, FileText, Loader2, CreditCard, Banknote, QrCode,
  Smartphone, ChevronDown, Dog, Clock, Package,
  CheckCircle, AlertCircle, Zap, History, RotateCcw,
} from 'lucide-react';
import {
  subscribeCaixa, subscribeProdutos,
  registrarVenda, deleteVenda,
  type CaixaDia, type Produto, type VendaItem,
  type AppUser, type Customer, type MovimentoCaixa,
} from '../services/dataService';
import { emitirDocumentoFiscal } from '../services/nfeService';
import { toLocalDateString } from '../services/dataService';
import { useTranslation } from 'react-i18next';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

// ─────────────────────────────────────────────────────────────────────────────
// Tipos internos
// ─────────────────────────────────────────────────────────────────────────────
type PayMethod = 'Dinheiro' | 'Pix' | 'Cartão Débito' | 'Cartão Crédito';
type NfeStatus = { type: 'success' | 'error'; msg: string } | null;

interface PDVAutonomoProps {
  userProfile: AppUser | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
export default function PDVAutonomo({ userProfile }: PDVAutonomoProps) {
  const { t } = useTranslation(['cashier', 'common']);
  const today = toLocalDateString(new Date());
  const [selectedDate] = useState(today);

  // ── Data ──────────────────────────────────────────────────────────────────
  const [caixa, setCaixa] = useState<CaixaDia | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSearchingClient, setIsSearchingClient] = useState(false);

  // ── Cart ──────────────────────────────────────────────────────────────────
  const [cart, setCart] = useState<VendaItem[]>([]);
  const [clienteNome, setClienteNome] = useState('');
  const [animalNome, setAnimalNome] = useState('');
  const [metodo, setMetodo] = useState<PayMethod | null>(null);
  const [maquininha, setMaquininha] = useState<'Stone' | 'Getnet' | null>(null);
  const [bandeira, setBandeira] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // ── Search ────────────────────────────────────────────────────────────────
  const [prodQuery, setProdQuery] = useState('');
  const [prodResults, setProdResults] = useState<Produto[]>([]);
  const [showProd, setShowProd] = useState(false);
  const [clienteQuery, setClienteQuery] = useState('');
  const [clienteResults, setClienteResults] = useState<Customer[]>([]);
  const [showCliente, setShowCliente] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [panel, setPanel] = useState<'vendas' | 'historico'>('vendas');
  const [lastVendaId, setLastVendaId] = useState<string | null>(null);
  const [lastVendaData, setLastVendaData] = useState<any>(null);
  const [isEmitting, setIsEmitting] = useState<string | null>(null);
  const [nfeStatus, setNfeStatus] = useState<NfeStatus>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMov, setSelectedMov] = useState<MovimentoCaixa | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successAnim, setSuccessAnim] = useState(false);

  // ── Subscriptions ─────────────────────────────────────────────────────────
  useEffect(() => {
    const u1 = subscribeCaixa(selectedDate, (data) => {
      setCaixa(data);
      setLoading(false);
    });
    return () => { u1(); };
  }, [selectedDate]);

  // Produto search
  useEffect(() => {
    if (prodQuery.length < 2) { setProdResults([]); setShowProd(false); return; }
    const u = subscribeProdutos((all) => {
      const q = prodQuery.toLowerCase();
      setProdResults(
        all.filter(p =>
          p.situacao === 'ativo' &&
          (p.nome.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q))
        ).slice(0, 8)
      );
      setShowProd(true);
    });
    return () => u();
  }, [prodQuery]);

  // Cliente search (on-demand)
  useEffect(() => {
    if (clienteQuery.length < 3 || selectedCustomer) {
      setClienteResults([]); setShowCliente(false); return;
    }
    
    const delayDebounce = setTimeout(async () => {
      setIsSearchingClient(true);
      const { searchCustomers } = await import('../services/dataService');
      const results = await searchCustomers(clienteQuery);
      setClienteResults(results);
      setShowCliente(true);
      setIsSearchingClient(false);
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [clienteQuery, selectedCustomer]);

  // ── Computed ──────────────────────────────────────────────────────────────
  const total = cart.reduce((s, i) => s + (i.venda ?? 0) * i.quantidade, 0);
  const vendas = caixa?.movimentos.filter(m => m.tipo === 'entrada').reverse() ?? [];
  const totalCaixa = vendas.reduce((s, m) => s + parseFloat(m.valor), 0);

  // ── Cart handlers ─────────────────────────────────────────────────────────
  const addToCart = (p: Produto) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id);
      return ex
        ? prev.map(i => i.id === p.id ? { ...i, quantidade: i.quantidade + 1 } : i)
        : [...prev, { ...p, quantidade: 1 }];
    });
    setProdQuery(''); setShowProd(false);
    setLastVendaId(null); setNfeStatus(null);
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const changeQty = (id: string, delta: number) => {
    setCart(prev =>
      prev.flatMap(i => {
        if (i.id !== id) return [i];
        const q = i.quantidade + delta;
        return q <= 0 ? [] : [{ ...i, quantidade: q }];
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setClienteNome(''); setAnimalNome('');
    setMetodo(null); setMaquininha(null); setBandeira(null);
    setSelectedCustomer(null); setClienteQuery('');
    setLastVendaId(null); setNfeStatus(null);
  };

  // ── Finalizar venda ───────────────────────────────────────────────────────
  const handleFinalizar = async () => {
    if (cart.length === 0) return;
    if (!metodo) return;
    if (metodo.includes('Cartão') && !maquininha) return;

    setIsSubmitting(true);
    try {
      const vData = { cart: [...cart], clienteNome, animalNome, total };
      const maquinaFinal = bandeira ? `${maquininha} (${bandeira})` : (maquininha || 'N/A');
      const result = await registrarVenda(
        selectedDate, cart, total,
        userProfile?.nome || 'Operador',
        metodo,
        { nome: clienteNome || 'Cliente PDV', animal: animalNome || 'N/A' },
        maquinaFinal
      );
      setLastVendaId(result.vendaId);
      setLastVendaData(vData);
      setSuccessAnim(true);
      setTimeout(() => setSuccessAnim(false), 2000);
      clearCart();
      setPanel('historico');
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar venda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── NFe ───────────────────────────────────────────────────────────────────
  const handleNfe = async (tipo: 'nfe' | 'nfse', vId?: string, vData?: any) => {
    const id = vId || lastVendaId;
    const data = vData || lastVendaData;
    if (!id || !data) return;
    setIsEmitting(tipo);
    setNfeStatus(null);
    const r = await emitirDocumentoFiscal(tipo, id, data);
    setNfeStatus({ type: r.success ? 'success' : 'error', msg: r.message });
    setIsEmitting(null);
  };

  // ── Delete venda ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!selectedMov) return;
    if (!confirm('Excluir esta venda? Isso removerá do Caixa e Monitoramento.')) return;
    setIsDeleting(true);
    try {
      await deleteVenda(selectedDate, selectedMov._id);
      setSelectedMov(null);
    } catch (err) {
      alert('Erro ao excluir venda.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render: Loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-mono text-xs uppercase tracking-widest">Sincronizando PDV...</p>
      </div>
    );
  }

  // ── Render: Caixa fechado ─────────────────────────────────────────────────
  if (!caixa) {
    return (
      <div className="h-screen w-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mx-auto">
            <Zap className="w-8 h-8 text-yellow-500" />
          </div>
          <p className="text-slate-600 text-sm font-bold">Caixa não aberto para hoje.</p>
          <p className="text-slate-400 text-xs">Abra o caixa no sistema principal primeiro.</p>
        </div>
      </div>
    );
  }

  // ── Render principal ──────────────────────────────────────────────────────
  const canSubmit = cart.length > 0 && !!metodo && (!metodo.includes('Cartão') || (!!maquininha && !!bandeira));

  return (
    <div className="h-screen w-screen bg-white flex overflow-hidden font-sans select-none text-slate-800" style={{ backgroundColor: '#ffffff' }}>

      {/* ── COLUNA ESQUERDA: BUSCA + CARRINHO ──────────────────────────────── */}
      <div className="flex flex-col w-[520px] min-w-[420px] border-r border-slate-200 bg-white">

        {/* Topbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center shadow-sm shadow-primary/20">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-slate-800 font-bold text-sm tracking-tight uppercase">{t('cashier:pos.title', 'BEA PDV')}</span>
            <span className="text-slate-300 text-xs">·</span>
            <span className="text-slate-500 text-xs">{userProfile?.nome}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              <Clock className="w-3 h-3" />
              {today.split('-').reverse().join('/')}
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Caixa aberto" />
          </div>
        </div>

        {/* Search bar — foco total */}
        <div className="px-4 pt-4 pb-3 relative">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={prodQuery}
              onChange={e => setProdQuery(e.target.value)}
              onFocus={() => prodQuery.length >= 2 && setShowProd(true)}
              onBlur={() => setTimeout(() => setShowProd(false), 150)}
              placeholder="Buscar produto ou serviço..."
              autoFocus
              className="w-full bg-slate-100 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold"
            />
            {prodQuery && (
              <button
                onClick={() => { setProdQuery(''); setShowProd(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dropdown produtos */}
          {showProd && prodResults.length > 0 && (
            <div className="absolute top-full left-4 right-4 z-50 mt-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2">
              {prodResults.map((p, i) => (
                <button
                  key={p.id}
                  onMouseDown={() => addToCart(p)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-left transition-colors border-b border-slate-100 last:border-0 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-slate-100 group-hover:bg-primary/10 rounded-lg flex items-center justify-center transition-colors text-[10px] font-black text-slate-400 group-hover:text-primary">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">{p.nome}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">{p.tipo} · {p.codigo}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-primary">{fmt(p.venda ?? 0)}</p>
                    {p.controlaEstoque && (
                      <p className="text-[10px] text-slate-300 uppercase font-black">Stk: {p.estoque}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Carrinho */}
        <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-30">
              <ShoppingCart className="w-10 h-10 text-slate-300" />
              <p className="text-slate-400 text-sm font-bold">Carrinho vazio</p>
              <p className="text-slate-300 text-[10px] uppercase tracking-widest">Aguardando itens...</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl px-3 py-3 group transition-all border border-slate-100"
              >
                {/* Índice */}
                <span className="text-[11px] font-black text-slate-300 w-5 text-center shrink-0">
                  {idx + 1}
                </span>

                {/* Nome */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 font-bold truncate uppercase">{item.nome}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{item.tipo}</p>
                </div>

                {/* Qty controls */}
                <div className="flex items-center gap-1 bg-white rounded-xl px-1 py-1 border border-slate-200">
                  <button
                    onClick={() => changeQty(item.id, -1)}
                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-sm font-black text-slate-800">{item.quantidade}</span>
                  <button
                    onClick={() => changeQty(item.id, 1)}
                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Subtotal */}
                <span className="text-sm font-black text-slate-800 w-24 text-right shrink-0 tabular-nums">
                  {fmt((item.venda ?? 0) * item.quantidade)}
                </span>

                {/* Remove */}
                <button
                  onClick={() => changeQty(item.id, -item.quantidade)}
                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Total bar */}
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-5 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Valor Total</span>
              {cart.length > 0 && (
                <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5 w-fit">
                  {cart.reduce((s, i) => s + i.quantidade, 0)} itens
                </span>
              )}
            </div>
            <span className="text-4xl font-black text-slate-800 tabular-nums tracking-tighter">{fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* ── COLUNA CENTRAL: CLIENTE + PAGAMENTO + AÇÃO ─────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 bg-slate-50/30">

        {/* Header da coluna central */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
          <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('cashier:pos.checkout', 'Finalização')}</span>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="flex items-center gap-1.5 text-gray-600 hover:text-red-400 text-xs transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              {t('common:clear', 'Limpar')}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── Banner sucesso ──────────────────────────────────────────────── */}
          {lastVendaId && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 space-y-4 shadow-sm animate-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-emerald-700 font-black text-xs uppercase tracking-widest">Venda registrada!</p>
                  <p className="text-emerald-400 text-[10px] font-bold">CÓD: {lastVendaId.slice(-8).toUpperCase()}</p>
                </div>
                <button
                  onClick={() => { setLastVendaId(null); setNfeStatus(null); }}
                  className="ml-auto text-emerald-300 hover:text-emerald-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleNfe('nfe')}
                  disabled={isEmitting !== null}
                  className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all shadow-sm disabled:opacity-40"
                >
                  {isEmitting === 'nfe' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4 text-primary" />}
                  Emitir NF-e
                </button>
                <button
                  onClick={() => handleNfe('nfse')}
                  disabled={isEmitting !== null}
                  className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all shadow-sm disabled:opacity-40"
                >
                  {isEmitting === 'nfse' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-purple-500" />}
                  Emitir NFS-e
                </button>
              </div>

              {nfeStatus && (
                <div className={`flex items-center gap-3 text-[10px] font-black uppercase rounded-xl px-4 py-3 border ${
                  nfeStatus.type === 'success'
                    ? 'bg-teal-50 text-teal-600 border-teal-100'
                    : 'bg-red-50 text-red-600 border-red-100'
                }`}>
                  {nfeStatus.type === 'success'
                    ? <CheckCircle className="w-4 h-4 shrink-0" />
                    : <AlertCircle className="w-4 h-4 shrink-0" />}
                  {nfeStatus.msg}
                </div>
              )}
            </div>
          )}

          {/* ── Cliente ─────────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dados do Cliente</p>

            <div className="relative">
              <input
                type="text"
                value={clienteQuery || clienteNome}
                onChange={e => {
                  setClienteQuery(e.target.value);
                  setClienteNome(e.target.value);
                  if (selectedCustomer) setSelectedCustomer(null);
                }}
                onBlur={() => setTimeout(() => setShowCliente(false), 150)}
                placeholder="Nome do Responsável (Opcional)"
                className="w-full bg-white border border-slate-200 text-slate-800 placeholder-slate-300 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold"
              />
              {isSearchingClient && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                </div>
              )}
              {selectedCustomer && (
                <button
                  onClick={() => { setSelectedCustomer(null); setClienteNome(''); setClienteQuery(''); setAnimalNome(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Cliente dropdown */}
              {showCliente && clienteResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2">
                  {clienteResults.map(c => (
                    <button
                      key={c.id}
                      onMouseDown={() => {
                        setSelectedCustomer(c);
                        setClienteNome(c.nome);
                        setClienteQuery('');
                        setAnimalNome(c.animais?.[0]?.nome || '');
                        setShowCliente(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-4 hover:bg-slate-50 text-left transition-colors border-b border-slate-50 last:border-0"
                    >
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black text-sm">
                        {c.nome[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-slate-800 font-bold">{c.nome}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">
                          Animais: {c.animais?.map(a => a.nome).join(', ') || 'N/A'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Animal */}
            {selectedCustomer && selectedCustomer.animais && selectedCustomer.animais.length > 0 ? (
              <div className="relative">
                <Dog className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
                <select
                  value={animalNome}
                  onChange={e => setAnimalNome(e.target.value)}
                  className="w-full bg-primary/5 border border-primary/20 text-primary rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary appearance-none cursor-pointer font-bold uppercase"
                >
                  {selectedCustomer.animais.map(a => (
                    <option key={a.nome}>{a.nome}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
              </div>
            ) : (
              <input
                type="text"
                value={animalNome}
                onChange={e => setAnimalNome(e.target.value)}
                placeholder="Nome do Animal (Opcional)"
                className="w-full bg-white border border-slate-200 text-slate-800 placeholder-slate-300 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold"
              />
            )}
          </div>

          {/* ── Pagamento ───────────────────────────────────────────────────── */}
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meio de Pagamento</p>

            <div className="grid grid-cols-2 gap-3">
              {([
                { id: 'Dinheiro', icon: Banknote, color: 'emerald', label: 'Dinheiro' },
                { id: 'Pix', icon: QrCode, color: 'sky', label: 'PIX' },
                { id: 'Cartão Débito', icon: CreditCard, color: 'violet', label: 'Cartão Débito' },
                { id: 'Cartão Crédito', icon: CreditCard, color: 'pink', label: 'Cartão Crédito' },
              ] as const).map(m => {
                const active = metodo === m.id;
                const colorMap = {
                  emerald: active ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm' : '',
                  sky: active ? 'border-teal-500 bg-teal-50 text-teal-600 shadow-sm' : '',
                  violet: active ? 'border-teal-500 bg-teal-50 text-teal-600 shadow-sm' : '',
                  pink: active ? 'border-pink-500 bg-pink-50 text-pink-600 shadow-sm' : '',
                };
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMetodo(m.id as PayMethod);
                      if (!m.id.includes('Cartão')) setMaquininha(null);
                    }}
                    className={`flex items-center gap-3 px-4 py-4 rounded-2xl border-2 transition-all ${
                      active
                        ? colorMap[m.color]
                        : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:text-slate-500'
                    }`}
                  >
                    <m.icon className={`w-5 h-5 shrink-0 ${active ? '' : 'opacity-40'}`} />
                    <span className="text-sm font-black uppercase tracking-tight">{m.label}</span>
                    {active && <CheckCircle className="w-4 h-4 ml-auto" />}
                  </button>
                );
              })}
            </div>

            {/* Maquininha e Bandeira */}
            {metodo?.includes('Cartão') && (
              <div className="space-y-4 animate-in slide-in-from-top-3 duration-500">
                <div className="flex gap-3">
                  {(['Stone', 'Getnet'] as const).map(m => {
                    const isSelected = maquininha === m;
                    // Usa pink se for crédito, violet se for débito (para manter a lógica de cores)
                    const activeColor = metodo === 'Cartão Crédito' ? 'border-pink-500 bg-pink-50 text-pink-600' : 'border-teal-500 bg-teal-50 text-teal-600';
                    
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => { setMaquininha(m); setBandeira(null); }}
                        className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border-2 text-sm font-black transition-all ${
                          isSelected
                            ? activeColor
                            : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        <Smartphone className={`w-5 h-5 ${isSelected ? 'animate-bounce' : ''}`} />
                        {m.toUpperCase()}
                      </button>
                    );
                  })}
                </div>

                {maquininha && (
                  <div className="grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    {['Visa', 'Master', 'Elo', 'Hiper', 'Amex', 'Outros'].map(b => {
                      const isB = bandeira === b;
                      return (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setBandeira(b)}
                          className={`py-3 rounded-xl border-2 text-[11px] font-black uppercase tracking-widest transition-all ${
                            isB
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm'
                              : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                          }`}
                        >
                          {b}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── CTA Footer ──────────────────────────────────────────────────── */}
        <div className="border-t border-slate-200 px-6 py-6 bg-white">
          <button
            onClick={handleFinalizar}
            disabled={!canSubmit || isSubmitting}
            className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all shadow-xl ${
              canSubmit && !isSubmitting
                ? 'bg-primary hover:bg-pink-600 text-white shadow-primary/20 active:scale-[0.98]'
                : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
            } ${successAnim ? 'bg-emerald-500 shadow-emerald-500/30' : ''}`}
          >
            {isSubmitting ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : successAnim ? (
              <><CheckCircle className="w-6 h-6" /> REGISTRADO!</>
            ) : (
              <><Check className="w-6 h-6" /> FINALIZAR VENDA</>
            )}
          </button>

          {!canSubmit && cart.length > 0 && !metodo && (
            <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-4 animate-pulse">Selecione o meio de pagamento</p>
          )}
          {!canSubmit && metodo?.includes('Cartão') && !maquininha && (
            <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-4 animate-pulse">Selecione a maquininha</p>
          )}
          {!canSubmit && maquininha && !bandeira && (
            <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-4 animate-pulse">Selecione a bandeira</p>
          )}
        </div>
      </div>

      {/* ── COLUNA DIREITA: HISTÓRICO DO DIA ───────────────────────────────── */}
      <div className="flex flex-col w-80 border-l border-slate-200 bg-slate-50/50">

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white">
          {([
            { id: 'vendas', label: 'Turno', icon: ShoppingCart },
            { id: 'historico', label: 'Info', icon: History },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setPanel(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
                panel === t.id
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Resumo do caixa */}
        <div className="px-5 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Total Turno</span>
            <span className="text-lg font-black text-emerald-500 tabular-nums tracking-tighter">{fmt(totalCaixa)}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">Vendas</span>
            <span className="text-xs font-black text-slate-500 tabular-nums">{vendas.length}</span>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          {panel === 'vendas' && (
            <div className="divide-y divide-slate-100">
              {vendas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-30 space-y-3">
                  <Package className="w-10 h-10 text-slate-300" />
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Sem vendas</p>
                </div>
              ) : vendas.map(mov => (
                <button
                  key={mov._id}
                  onClick={() => setSelectedMov(mov)}
                  className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-white text-left transition-all ${
                    selectedMov?._id === mov._id ? 'bg-white shadow-inner border-l-4 border-primary' : ''
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedMov?._id === mov._id ? 'bg-primary/10 text-primary' : 'bg-emerald-50 text-emerald-500'
                  }`}>
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-slate-700 truncate uppercase">
                      {mov.descricao.split(' - ')[2] || 'Cliente PDV'}
                    </p>
                    <p className="text-[10px] font-bold text-slate-300 tracking-tighter">{fmtTime(mov.criadoEm)}</p>
                  </div>
                  <span className="text-xs font-black text-slate-800 tabular-nums tracking-tighter">
                    {fmt(parseFloat(mov.valor))}
                  </span>
                </button>
              ))}
            </div>
          )}

          {panel === 'historico' && selectedMov && (
            <div className="p-5 space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="space-y-4">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Informações</p>
                <div className="bg-white rounded-2xl p-5 space-y-3 border border-slate-100 shadow-sm">
                  <Row label="Identificador" value={`#${selectedMov._id.slice(-8)}`} />
                  <Row label="Valor Final" value={fmt(parseFloat(selectedMov.valor))} highlight />
                  <Row label="Operador" value={selectedMov.operador} />
                  <Row label="Realizada às" value={fmtTime(selectedMov.criadoEm)} />
                  <div className="pt-3 border-t border-slate-50">
                    <p className="text-[10px] text-slate-300 uppercase font-black mb-1.5">Descrição Técnica</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-bold uppercase tracking-tighter">{selectedMov.descricao}</p>
                  </div>
                </div>
              </div>

              {/* Ações da venda selecionada */}
              <div className="space-y-2">
                <button
                  onClick={() => handleNfe('nfe', selectedMov._id, {
                    total: parseFloat(selectedMov.valor),
                    clienteNome: selectedMov.descricao.split(' - ')[2] || 'Cliente'
                  })}
                  disabled={isEmitting !== null}
                  className="w-full flex items-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest py-4 px-4 rounded-2xl transition-all shadow-sm active:scale-95 disabled:opacity-40"
                >
                  {isEmitting === 'nfe' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4 text-primary" />}
                  Emitir NF-e
                </button>
                <button
                  onClick={() => handleNfe('nfse', selectedMov._id, {
                    total: parseFloat(selectedMov.valor),
                    clienteNome: selectedMov.descricao.split(' - ')[2] || 'Cliente'
                  })}
                  disabled={isEmitting !== null}
                  className="w-full flex items-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest py-4 px-4 rounded-2xl transition-all shadow-sm active:scale-95 disabled:opacity-40"
                >
                  {isEmitting === 'nfse' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-purple-500" />}
                  Emitir NFS-e
                </button>
                <div className="pt-4">
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-widest py-2 transition-colors disabled:opacity-40"
                  >
                    {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Estornar Venda
                  </button>
                </div>
              </div>

              {nfeStatus && (
                <div className={`flex items-center gap-3 text-[10px] font-black uppercase rounded-2xl p-4 animate-in zoom-in-95 ${
                  nfeStatus.type === 'success'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : 'bg-red-50 text-red-600 border border-red-100'
                }`}>
                  {nfeStatus.type === 'success'
                    ? <CheckCircle className="w-4 h-4 shrink-0" />
                    : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{nfeStatus.msg}</span>
                </div>
              )}

              <button
                onClick={() => setSelectedMov(null)}
                className="w-full text-slate-300 hover:text-slate-500 text-[10px] font-black uppercase tracking-widest py-4 transition-colors"
              >
                ← Voltar
              </button>
            </div>
          )}

          {panel === 'historico' && !selectedMov && (
            <div className="flex flex-col items-center justify-center py-20 opacity-20 space-y-3">
              <History className="w-10 h-10 text-slate-400" />
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest text-center px-10">Selecione uma venda para ver detalhes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helper component ──────────────────────────────────────────────────────────
function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">{label}</span>
      <span className={`text-[11px] font-black uppercase tabular-nums ${highlight ? 'text-emerald-500' : 'text-slate-700'}`}>
        {value}
      </span>
    </div>
  );
}
