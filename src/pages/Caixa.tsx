import { useState, useEffect } from 'react';
import {
  Lock, Unlock, CheckCircle, ChevronDown, ChevronUp, ChevronRight,
  Clock, ShoppingCart, Search, Trash2, Plus, Minus, Check, X, Filter,
  Receipt, FileText, Dog, Loader2, CreditCard, Banknote, QrCode,
  Smartphone, History, RotateCcw, AlertCircle
} from 'lucide-react';
import {
  abrirCaixa, fecharCaixa, reabrirCaixa, subscribeCaixa, subscribeProducts, subscribeCustomers, registrarVenda, deleteVenda, subscribeServices, APP_ID,
  type CaixaDia, type Product, type Produto, type VendaItem, type AppUser, type Customer, type MovimentoCaixa, type ClinicService
} from '../services/dataService';
import { emitirDocumentoFiscal } from '../services/nfeService';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useTranslation } from 'react-i18next';

const Caixa = ({ userProfile }: { userProfile: AppUser | null }) => {
  const { t } = useTranslation(['cashier', 'common']);
  const isPdvMode = new URLSearchParams(window.location.search).get('mode') === 'pdv';
  const [caixa, setCaixa] = useState<CaixaDia | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Venda State
  const [cart, setCart] = useState<VendaItem[]>([]);
  const [clienteNome, setClienteNome] = useState('');
  const [animalNome, setAnimalNome] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState<string | null>(null);
  const [maquininha, setMaquininha] = useState<string | null>(null);
  const [bandeiraCartao, setBandeiraCartao] = useState<string | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [vendaTipo, setVendaTipo] = useState<'Venda' | 'Orçamento'>('Venda');
  const [lastVendaId, setLastVendaId] = useState<string | null>(null);
  const [lastVendaData, setLastVendaData] = useState<any>(null);

  // Management State (Modal/Panel for previous sales)
  const [selectedMov, setSelectedMov] = useState<MovimentoCaixa | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // NFe State
  const [isEmitting, setIsEmitting] = useState<string | null>(null);
  const [nfeStatus, setNfeStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // Search State - Produtos
  const [searchQuery, setSearchQuery] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{type: 'loading'|'success'|'error'|'warning', message: string} | null>(null);

  // Search State - Clientes
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Abertura State
  const [saldoInicial, setSaldoInicial] = useState('');
  const [operadorNome, setOperadorNome] = useState(userProfile?.nome || '');

  // Fechamento State
  const [showFecharModal, setShowFecharModal] = useState(false);
  const [valorContado, setValorContado] = useState('');
  const [obsFechamento, setObsFechamento] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (userProfile) setOperadorNome(userProfile.nome);
  }, [userProfile]);

  useEffect(() => {
    const unsub = subscribeCaixa(selectedDate, (data) => {
      setCaixa(data);
      setLoading(false);
    });
    return () => unsub();
  }, [selectedDate]);

  useEffect(() => {
    const unsub = subscribeCustomers(setCustomers);
    return () => unsub();
  }, []);

  // Integração com Agendamentos: preencher dados via URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const serviceId = params.get('serviceId');
    const cName = params.get('clientName');
    const aName = params.get('animalName');

    if (cName) setClienteNome(decodeURIComponent(cName));
    if (aName) setAnimalNome(decodeURIComponent(aName));

    if (serviceId) {
       const unsub = subscribeServices((all) => {
          const s = all.find(x => x.id === serviceId);
          if (s) {
            setCart(prev => {
              if (prev.some(p => p.id === s.id)) return prev;
              return [...prev, {
                id: s.id,
                nome: s.name,
                codigo: 'SRV',
                tipo: 'Serviço',
                marca: s.category,
                venda: s.price,
                estoque: 999,
                situacao: 'ativo',
                grupo: 'Serviços',
                unidade: 'UN',
                proposito: null,
                controlaEstoque: false,
                custo: 0,
                codigoBarra: null,
                quantidade: 1
              } as any];
            });
          }
       });
       return () => unsub();
    }
  }, []);

  // Barcode Scanner Logic
  const handleBarcodeScan = async (barcode: string) => {
    setScanFeedback({ type: 'loading', message: `Buscando: ${barcode}...` });

    try {
      const q = query(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'products'),
        where('barcode', '==', barcode),
        where('status', '==', 'active'),
        limit(1)
      );
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setScanFeedback({ type: 'error', message: `❌ Código não encontrado: ${barcode}` });
      } else {
        const docSnap = snap.docs[0];
        const p = { id: docSnap.id, ...docSnap.data() } as Product;
        
        if (p.salePrice === 0) {
          setScanFeedback({ type: 'warning', message: `⚠️ ${p.name} — Uso interno apenas` });
        } else {
          const produto: Produto = {
            id: p.id,
            nome: p.name,
            codigo: p.internalCode || '',
            codigoBarra: p.barcode || null,
            tipo: p.type === 'service' ? 'Serviço' : 'Produto',
            marca: p.brand || null,
            venda: p.salePrice,
            estoque: p.currentStock || 0,
            situacao: 'ativo',
            grupo: p.group || '',
            unidade: p.unit || 'UN',
            proposito: p.purpose || null,
            controlaEstoque: p.controlsStock,
            custo: p.costPrice || 0
          };
          
          handleAddToCart(produto);
          setScanFeedback({ type: 'success', message: `✅ ${p.name} — R$ ${p.salePrice.toFixed(2)}` });
        }
      }
    } catch (err) {
      console.error(err);
      setScanFeedback({ type: 'error', message: `❌ Erro ao buscar código: ${barcode}` });
    }

    setTimeout(() => setScanFeedback(null), 3000);
  };

  useBarcodeScanner({
    onScan: handleBarcodeScan,
    enabled: true
  });

  useEffect(() => {
    if (searchQuery.length > 1) {
      let allProds: Product[] = [];
      let allServs: ClinicService[] = [];
      
      const filterAndSet = () => {
        const queryStr = searchQuery.toLowerCase();
        
        const servsAsProds: Produto[] = allServs.filter(s => s.status === 'Active').map(s => ({
          id: s.id,
          nome: s.name,
          codigo: 'SRV',
          tipo: 'Serviço',
          marca: s.category,
          venda: s.price,
          estoque: 999,
          situacao: 'ativo',
          grupo: 'Serviços',
          unidade: 'UN',
          proposito: null,
          controlaEstoque: false,
          custo: 0,
          codigoBarra: null
        }));

        const newProdsAsProds: Produto[] = allProds
          .filter(p => p.status === 'active' && p.salePrice > 0)
          .map(p => ({
            id: p.id,
            nome: p.name,
            codigo: p.internalCode || '',
            codigoBarra: p.barcode || null,
            tipo: p.type === 'service' ? 'Serviço' : 'Produto',
            marca: p.brand || null,
            venda: p.salePrice,
            estoque: p.currentStock || 0,
            situacao: 'ativo',
            grupo: p.group || '',
            unidade: p.unit || 'UN',
            proposito: p.purpose || null,
            controlaEstoque: p.controlsStock,
            custo: p.costPrice || 0
          }));
        
        const combined = [...newProdsAsProds, ...servsAsProds];
        const filtered = combined.filter(p => 
          p.nome.toLowerCase().includes(queryStr) || 
          (p.codigo || '').toLowerCase().includes(queryStr) ||
          (p.codigoBarra || '').includes(queryStr)
        );
        setProdutos(filtered.slice(0, 8));
        setShowResults(true);
      };

      const unsubP = subscribeProducts((all) => {
        allProds = all;
        filterAndSet();
      });
      
      const unsubS = subscribeServices((all) => {
        allServs = all;
        filterAndSet();
      });

      return () => { unsubP(); unsubS(); };
    } else {
      setShowResults(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (clienteNome.length > 1 && !selectedCustomer) {
      const queryStr = clienteNome.toLowerCase();
      const filtered = customers.filter(c => 
        c.nome.toLowerCase().includes(queryStr) || 
        (c.animais && c.animais.some(a => a.nome.toLowerCase().includes(queryStr)))
      );
      setFilteredCustomers(filtered.slice(0, 5));
      setShowCustomerResults(true);
    } else {
      setShowCustomerResults(false);
    }
  }, [clienteNome, customers, selectedCustomer]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setClienteNome(customer.nome);
    if (customer.animais && customer.animais.length > 0) {
      setAnimalNome(customer.animais[0].nome);
    } else {
      setAnimalNome('');
    }
    setShowCustomerResults(false);
  };

  const handleAddToCart = (produto: Produto) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === produto.id);
      if (existing) {
        return prev.map(item => item.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item);
      }
      return [...prev, { ...produto, quantidade: 1 }];
    });
    setSearchQuery('');
    setShowResults(false);
    setLastVendaId(null);
    setNfeStatus(null);
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const totalVenda = cart.reduce((acc, item) => acc + ((item.venda ?? 0) * item.quantidade), 0);

  const handleFinalizarVenda = async () => {
    if (cart.length === 0) return alert('O carrinho está vazio.');
    if (!metodoPagamento) return alert('Por favor, selecione uma forma de pagamento.');
    if (metodoPagamento.includes('Cartão') && !maquininha) return alert('Por favor, selecione a maquininha utilizada (Stone ou Getnet).');
    if (metodoPagamento.includes('Cartão') && !bandeiraCartao) return alert('Por favor, selecione a bandeira do cartão.');
    
    try {
      const vData = { cart: [...cart], clienteNome, animalNome, total: totalVenda };
      const result = await registrarVenda(
        selectedDate, 
        cart, 
        totalVenda, 
        operadorNome, 
        metodoPagamento,
        { nome: clienteNome, animal: animalNome },
        bandeiraCartao ? `${maquininha} (${bandeiraCartao})` : (maquininha || 'N/A')
      );
      setLastVendaId(result?.vendaId || `venda_${Date.now()}`);
      setLastVendaData(vData);
      setCart([]);
      setClienteNome('');
      setAnimalNome('');
      setMetodoPagamento(null);
      setMaquininha(null);
      setBandeiraCartao(null);
      setSelectedCustomer(null);
      setObservacoes('');
      setNfeStatus(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar venda.');
    }
  };

  const handleEmitirNota = async (tipo: 'nfe' | 'nfse', customVendaId?: string, customVendaData?: any) => {
    const vId = customVendaId || lastVendaId;
    const vData = customVendaData || lastVendaData;
    
    if (!vId || !vData) return alert('Dados da venda não encontrados para emissão.');
    
    setIsEmitting(tipo);
    setNfeStatus(null);
    
    const result = await emitirDocumentoFiscal(tipo, vId, vData);
    
    if (result.success) {
      setNfeStatus({ type: 'success', msg: result.message });
    } else {
      setNfeStatus({ type: 'error', msg: result.message });
    }
    setIsEmitting(null);
  };

  const handleDeleteVenda = async () => {
    if (!selectedMov) return;
    if (!confirm('Tem certeza que deseja excluir esta venda? Isso removerá o registro do Caixa e do Monitoramento.')) return;
    
    setIsDeleting(true);
    try {
      const vId = selectedMov._id; 
      await deleteVenda(selectedDate, vId);
      setSelectedMov(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir venda.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAbrirCaixa = async () => {
    try {
      await abrirCaixa(selectedDate, saldoInicial, operadorNome);
      const url = new URL(window.location.href);
      url.searchParams.set('mode', 'pdv');
      url.searchParams.delete('tab'); // Limpa o tab anterior para não haver conflito
      window.open(url.toString(), '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error(err);
      alert('Erro ao abrir caixa.');
    }
  };

  const handleFecharCaixa = async () => {
    if (!valorContado) return alert('Por favor, informe o valor contado no caixa.');
    setIsClosing(true);
    try {
      await fecharCaixa(selectedDate, valorContado, obsFechamento, userProfile?.nome || 'Operador');
      setShowFecharModal(false);
      setValorContado('');
      setObsFechamento('');
    } catch (err) {
      console.error(err);
      alert('Erro ao fechar caixa.');
    } finally {
      setIsClosing(false);
    }
  };

  const handleReabrirCaixa = async () => {
    if (!confirm('Tem certeza que deseja reabrir o caixa deste dia?')) return;
    try {
      await reabrirCaixa(selectedDate);
      if (isPdvMode) {
        alert('Caixa reaberto com sucesso!');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao reabrir caixa.');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  if (caixa && caixa.status === 'fechado') {
    return (
      <div className="max-w-2xl mx-auto mt-20 animate-fade-in space-y-6">
        <div className="bg-white rounded-[40px] p-10 shadow-xl border border-slate-100 text-center space-y-6">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Lock className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-800">Caixa Encerrado</h2>
            <p className="text-slate-500 font-medium">O expediente do dia {selectedDate.split('-').reverse().join('/')} foi finalizado.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 py-6">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Sistema</p>
              <p className="text-2xl font-black text-slate-800">R$ {caixa.movimentos.filter(m => m.tipo === 'entrada').reduce((a, b) => a + parseFloat(b.valor), 0).toFixed(2)}</p>
            </div>
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Valor Contado</p>
              <p className="text-2xl font-black text-emerald-600">R$ {parseFloat(caixa.fechamento?.valorContado || '0').toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Resumo do Fechamento</p>
             <div className="space-y-2 text-sm text-slate-600">
                <p><strong>Operador:</strong> {caixa.fechamento?.operador}</p>
                <p><strong>Horário:</strong> {new Date(caixa.fechamento?.fechadoEm || '').toLocaleTimeString()}</p>
                {caixa.fechamento?.observacoes && (
                  <p className="italic text-slate-500 mt-2">"{caixa.fechamento.observacoes}"</p>
                )}
             </div>
          </div>

          <div className="flex flex-col gap-4 pt-4 border-t border-slate-50">
            <button 
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="text-primary font-bold hover:underline text-sm"
            >
              Voltar para o dia de hoje
            </button>

            {(userProfile?.role === 'administrador' || userProfile?.role === 'gerente') && (
              <button 
                onClick={handleReabrirCaixa}
                className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-all pt-2"
              >
                <RotateCcw className="w-3 h-3" />
                Reabrir Caixa (Admin)
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!caixa) {
    return (
      <div className="max-w-md mx-auto mt-20 animate-fade-in">
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-purple-100 space-y-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-purple-50 rounded-full text-primary">
              <Lock className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Caixa Fechado</h2>
            <p className="text-slate-500">Abra o caixa para iniciar as operações do dia {selectedDate.split('-').reverse().join('/')}.</p>
          </div>

          <div className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Operador</label>
              <input
                type="text"
                value={operadorNome}
                onChange={e => setOperadorNome(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-700 focus:ring-2 focus:ring-primary/20"
                placeholder="Seu nome"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Saldo Inicial (R$)</label>
              <input
                type="number"
                value={saldoInicial}
                onChange={e => setSaldoInicial(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-700 focus:ring-2 focus:ring-primary/20"
                placeholder="0,00"
              />
            </div>
            <button
              onClick={handleAbrirCaixa}
              className="w-full bg-primary hover:bg-pink-600 text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Unlock className="w-5 h-5" />
              Abrir Caixa Agora
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fade-in -m-6 lg:-m-8 min-h-screen bg-slate-100/50">
      
      {/* PAINEL ESQUERDO: NOVA VENDA */}
      <div className="flex-1 p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
           <h1 className="text-2xl font-bold text-slate-800">{t('cashier:pos.title', 'Ponto de Venda')}</h1>
           <div className="flex items-center gap-3">
             <button 
               onClick={() => window.open(window.location.origin + '?tab=caixa', '_blank')}
               className="flex items-center gap-2 text-xs font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-100 transition-all shadow-sm"
               title="Abrir outra aba para navegar no sistema"
             >
               <Plus className="w-3.5 h-3.5" />
               Abrir outra aba
             </button>
             <div className="flex items-center gap-2 text-sm text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
               <Clock className="w-4 h-4 text-primary" />
               {selectedDate.split('-').reverse().join('/')}
             </div>
           </div>
        </div>

        {lastVendaId && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 animate-in zoom-in-95 duration-300 flex flex-col items-center gap-4">
            <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-emerald-800 text-lg">Venda Realizada!</h3>
                  <p className="text-emerald-600 text-sm">O que deseja fazer agora?</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button 
                  disabled={isEmitting !== null}
                  onClick={() => handleEmitirNota('nfe')}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-xl border border-slate-200 text-xs flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isEmitting === 'nfe' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4 text-teal-500" />}
                  Gerar NF-e (Produtos)
                </button>
                <button 
                  disabled={isEmitting !== null}
                  onClick={() => handleEmitirNota('nfse')}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-xl border border-slate-200 text-xs flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isEmitting === 'nfse' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-purple-500" />}
                  Gerar NFS-e (Serviços)
                </button>
                <button 
                  onClick={() => { setLastVendaId(null); setNfeStatus(null); }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all"
                >
                  Nova Venda
                </button>
              </div>
            </div>

            {nfeStatus && (
              <div className={`w-full mt-2 p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2 ${nfeStatus.type === 'success' ? 'bg-teal-100 text-teal-700' : 'bg-red-100 text-red-700'}`}>
                {nfeStatus.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                {nfeStatus.msg}
              </div>
            )}
          </div>
        )}

        {/* MODAL DE GESTÃO DE VENDA ANTERIOR */}
        {selectedMov && (
          <div className="bg-white border-2 border-teal-200 rounded-2xl p-6 animate-in slide-in-from-top-4 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 rounded-lg text-teal-600">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 uppercase tracking-tight">Detalhes da Venda</h3>
                  <p className="text-xs text-slate-400">ID: {selectedMov._id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedMov(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Descrição</p>
                <p className="text-sm font-bold text-slate-700">{selectedMov.descricao}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Valor</p>
                <p className="text-sm font-black text-emerald-600">R$ {parseFloat(selectedMov.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Operador</p>
                <p className="text-sm text-slate-600">{selectedMov.operador}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Horário</p>
                <p className="text-sm text-slate-600">{new Date(selectedMov.criadoEm).toLocaleTimeString()}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-50">
              <button 
                onClick={() => handleEmitirNota('nfe', selectedMov._id, { total: parseFloat(selectedMov.valor), clienteNome: selectedMov.descricao.split(' - ')[2] || 'Cliente' })}
                className="bg-teal-500 hover:bg-teal-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm"
              >
                <Receipt className="w-4 h-4" /> Gerar NF-e
              </button>
              <button 
                onClick={() => handleEmitirNota('nfse', selectedMov._id, { total: parseFloat(selectedMov.valor), clienteNome: selectedMov.descricao.split(' - ')[2] || 'Cliente' })}
                className="bg-purple-500 hover:bg-purple-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm"
              >
                <FileText className="w-4 h-4" /> Gerar NFS-e
              </button>
              <div className="flex-1" />
              <button 
                disabled={isDeleting}
                onClick={handleDeleteVenda}
                className="bg-white hover:bg-red-50 text-red-500 border border-red-100 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Excluir Venda
              </button>
            </div>
          </div>
        )}

        {/* SCANNER FEEDBACK */}
        <div className={`rounded-xl border shadow-sm p-4 flex items-center gap-4 transition-all ${
          !scanFeedback ? 'bg-white border-slate-200' :
          scanFeedback.type === 'loading' ? 'bg-amber-50 border-amber-200' :
          scanFeedback.type === 'success' ? 'bg-emerald-50 border-emerald-200' :
          scanFeedback.type === 'warning' ? 'bg-amber-50 border-amber-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            !scanFeedback ? 'bg-slate-100 text-slate-400' :
            scanFeedback.type === 'loading' ? 'bg-amber-100 text-amber-600' :
            scanFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
            scanFeedback.type === 'warning' ? 'bg-amber-100 text-amber-600' :
            'bg-red-100 text-red-600'
          }`}>
            {!scanFeedback ? <QrCode className="w-5 h-5" /> :
             scanFeedback.type === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> :
             scanFeedback.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
             scanFeedback.type === 'warning' ? <AlertCircle className="w-5 h-5" /> :
             <X className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            {!scanFeedback ? (
              <p className="font-bold text-slate-700 text-sm">Scanner pronto</p>
            ) : (
              <p className={`font-bold text-sm ${
                scanFeedback.type === 'loading' ? 'text-amber-700' :
                scanFeedback.type === 'success' ? 'text-emerald-700' :
                scanFeedback.type === 'warning' ? 'text-amber-700' :
                'text-red-700'
              }`}>{scanFeedback.message}</p>
            )}
            {!scanFeedback && <p className="text-xs text-slate-500">Passe um produto na leitora de código de barras para adicionar ao carrinho.</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-teal-500 px-6 py-3">
             <h2 className="text-white font-bold text-sm uppercase tracking-wider">Nova venda</h2>
          </div>

          <div className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-slate-400 uppercase">Data*</label>
                 <input 
                   type="date" 
                   value={selectedDate}
                   onChange={e => setSelectedDate(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:ring-2 focus:ring-teal-500/20 outline-none" 
                 />
               </div>
               <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo*</label>
                 <div className="flex gap-0.5 bg-slate-100 p-0.5 rounded-lg">
                   <button 
                     onClick={() => setVendaTipo('Venda')}
                     className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${vendaTipo === 'Venda' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                   >Venda</button>
                   <button 
                     onClick={() => setVendaTipo('Orçamento')}
                     className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${vendaTipo === 'Orçamento' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                   >Orçamento</button>
                 </div>
               </div>
               <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo de venda*</label>
                 <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:ring-2 focus:ring-teal-500/20 outline-none">
                   <option>Presencial, para consumidor final</option>
                   <option>Telefone / Entrega</option>
                 </select>
               </div>
            </div>

            {/* Cliente Section */}
            <div className="space-y-3 relative">
               <h3 className="text-teal-500 font-bold border-b border-teal-100 pb-2">Cliente</h3>
               <div className="flex flex-wrap gap-3">
                 {/* Responsável */}
                 <div className="flex-1 min-w-[200px] relative">
                   <input 
                    type="text" 
                    placeholder="Responsável"
                    value={clienteNome}
                    onChange={e => {
                      setClienteNome(e.target.value);
                      if (selectedCustomer) setSelectedCustomer(null);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500/20 outline-none"
                   />
                   {selectedCustomer && (
                     <button 
                      onClick={() => setSelectedCustomer(null)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-colors"
                     >
                       <X className="w-4 h-4" />
                     </button>
                   )}
                 </div>

                 {/* Animal - Select ou Input */}
                 <div className="flex-1 min-w-[200px]">
                   {selectedCustomer && selectedCustomer.animais && selectedCustomer.animais.length > 0 ? (
                     <div className="relative">
                        <select 
                          value={animalNome}
                          onChange={e => setAnimalNome(e.target.value)}
                          className="w-full bg-teal-50 border border-teal-200 text-teal-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500/20 outline-none appearance-none font-medium"
                        >
                          {selectedCustomer.animais.map(a => (
                            <option key={a.nome} value={a.nome}>{a.nome}</option>
                          ))}
                        </select>
                        <Dog className="w-3.5 h-3.5 absolute right-8 top-1/2 -translate-y-1/2 text-teal-400 pointer-events-none" />
                        <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-teal-400 pointer-events-none" />
                     </div>
                   ) : (
                     <input 
                      type="text" 
                      placeholder="Animal"
                      value={animalNome}
                      onChange={e => setAnimalNome(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500/20 outline-none"
                     />
                   )}
                 </div>
                 
                 <button className="bg-slate-100 hover:bg-slate-200 p-2 rounded-lg text-slate-500 transition-all">
                   <Search className="w-4 h-4" />
                 </button>
                 <button className="bg-amber-500 hover:bg-amber-600 p-2 rounded-lg text-white transition-all">
                   <Filter className="w-4 h-4" />
                 </button>
               </div>

               {showCustomerResults && filteredCustomers.length > 0 && (
                 <div className="absolute top-full left-0 right-12 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2">
                   {filteredCustomers.map(c => (
                     <button
                       key={c.id}
                       onClick={() => handleSelectCustomer(c)}
                       className="w-full flex items-center justify-between p-4 hover:bg-teal-50 text-left transition-colors border-b border-slate-50 last:border-0"
                     >
                       <div>
                         <p className="text-sm font-bold text-slate-700">{c.nome}</p>
                         <p className="text-[10px] text-slate-400 uppercase">
                           Animais: {c.animais?.map(a => a.nome).join(', ') || 'Nenhum'}
                         </p>
                       </div>
                       <ChevronRight className="w-4 h-4 text-slate-300" />
                     </button>
                   ))}
                 </div>
               )}
            </div>

            {/* Produtos Section */}
            <div className="space-y-3 relative">
               <h3 className="text-teal-500 font-bold border-b border-teal-100 pb-2">Produtos e Serviços</h3>
               <div className="relative group">
                 <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all">
                   <input 
                    type="text" 
                    placeholder="Produto, serviço ou código de barras"
                    data-barcode-input="true"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && searchQuery.trim().length > 0) {
                        handleBarcodeScan(searchQuery.trim());
                        setSearchQuery('');
                        setShowResults(false);
                        e.preventDefault();
                      }
                    }}
                    className="flex-1 bg-transparent text-sm outline-none"
                   />
                   <Search className="w-4 h-4 text-slate-400" />
                 </div>

                 {showResults && produtos.length > 0 && (
                   <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                     {produtos.map(p => (
                       <button
                         key={p.id}
                         onClick={() => handleAddToCart(p)}
                         className="w-full flex items-center justify-between p-4 hover:bg-teal-50 text-left transition-colors border-b border-slate-50 last:border-0"
                       >
                         <div>
                           <p className="text-sm font-bold text-slate-700">
                             {p.nome}
                             {p.codigoBarra && <span className="ml-2 text-[10px] text-emerald-500">🔲</span>}
                           </p>
                           <div className="flex items-center gap-2 mt-0.5">
                             {p.tipo === 'Serviço' ? (
                               <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-600 font-bold uppercase">Serviço</span>
                             ) : (
                               <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-600 font-bold uppercase">Produto</span>
                             )}
                             <p className="text-[10px] text-slate-400 uppercase">{p.marca || 'S/ Marca'}</p>
                           </div>
                         </div>
                         <div className="text-right">
                           <p className="text-sm font-bold text-teal-600">R$ {(p.venda ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                           <p className="text-[10px] text-slate-400">Estoque: {p.estoque}</p>
                         </div>
                       </button>
                     ))}
                   </div>
                 )}
               </div>

               {cart.length > 0 && (
                 <div className="mt-4 border border-slate-100 rounded-xl overflow-hidden">
                   <table className="w-full text-sm">
                     <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase">
                       <tr>
                         <th className="px-4 py-2 text-left">Item</th>
                         <th className="px-4 py-2 text-center w-24">Qtd</th>
                         <th className="px-4 py-2 text-right">Unitário</th>
                         <th className="px-4 py-2 text-right">Subtotal</th>
                         <th className="px-4 py-2 text-center w-10"></th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                       {cart.map(item => (
                         <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                           <td className="px-4 py-3">
                             <p className="font-medium text-slate-700">{item.nome}</p>
                             <p className="text-[10px] text-slate-400">{item.tipo}</p>
                           </td>
                           <td className="px-4 py-3">
                             <div className="flex items-center justify-center gap-2">
                               <button onClick={() => {
                                 if (item.quantidade > 1) {
                                   setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantidade: i.quantidade - 1 } : i));
                                 }
                               }} className="p-1 hover:text-primary transition-colors"><Minus className="w-3 h-3" /></button>
                               <span className="w-8 text-center font-bold">{item.quantidade}</span>
                               <button onClick={() => {
                                 setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantidade: i.quantidade + 1 } : i));
                               }} className="p-1 hover:text-primary transition-colors"><Plus className="w-3 h-3" /></button>
                             </div>
                           </td>
                           <td className="px-4 py-3 text-right text-slate-600">R$ {(item.venda ?? 0).toFixed(2)}</td>
                           <td className="px-4 py-3 text-right font-bold text-slate-800">R$ {((item.venda ?? 0) * item.quantidade).toFixed(2)}</td>
                           <td className="px-4 py-3 text-center">
                             <button onClick={() => handleRemoveFromCart(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                               <Trash2 className="w-4 h-4" />
                             </button>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                     <tfoot className="bg-slate-50/50">
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-right font-bold text-slate-500">TOTAL:</td>
                          <td className="px-4 py-3 text-right font-black text-lg text-teal-600">
                            R$ {totalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td></td>
                        </tr>
                     </tfoot>
                   </table>
                 </div>
               )}
            </div>

            {/* Forma de Pagamento */}
            <div className="space-y-4">
               <h3 className="text-teal-500 font-bold border-b border-teal-100 pb-2">Forma de Pagamento*</h3>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                 {[
                   { id: 'Dinheiro', icon: Banknote, color: 'emerald' },
                   { id: 'Pix', icon: QrCode, color: 'sky' },
                   { id: 'Cartão Débito', icon: CreditCard, color: 'purple', flags: 'Visa / Master / Elo' },
                   { id: 'Cartão Crédito', icon: CreditCard, color: 'pink', flags: 'Visa / Master / Elo / Amex' }
                 ].map((metodo) => (
                   <button
                    key={metodo.id}
                    onClick={() => {
                      setMetodoPagamento(metodo.id);
                      if (!metodo.id.includes('Cartão')) setMaquininha(null);
                    }}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 relative overflow-hidden ${
                      metodoPagamento === metodo.id 
                      ? `border-${metodo.color}-500 bg-${metodo.color}-50 text-${metodo.color}-600 shadow-md` 
                      : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                    }`}
                   >
                     <metodo.icon className="w-6 h-6" />
                     <span className="text-[10px] font-bold uppercase tracking-tight">{metodo.id}</span>
                     {metodo.flags && (
                       <span className="text-[8px] opacity-60 font-medium">{metodo.flags}</span>
                     )}
                   </button>
                 ))}
               </div>

               {metodoPagamento && metodoPagamento.includes('Cartão') && (
                 <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 animate-in slide-in-from-top-4 space-y-4">
                   <div className="flex items-center gap-2 text-slate-600 mb-2">
                     <Smartphone className="w-4 h-4 text-teal-500" />
                     <h4 className="text-xs font-bold uppercase tracking-wider">Selecione a Maquininha*</h4>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     {['Stone', 'Getnet'].map(m => (
                       <button
                        key={m}
                        onClick={() => setMaquininha(m)}
                        className={`flex items-center justify-center p-4 rounded-xl border-2 font-bold transition-all ${
                          maquininha === m 
                          ? 'border-teal-500 bg-white text-teal-600 shadow-lg scale-[1.02]' 
                          : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                        }`}
                       >
                         {m === 'Stone' ? '🟢 STONE' : '🔴 GETNET'}
                       </button>
                     ))}
                   </div>
                   {maquininha && (
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-300">
                        {['Visa', 'Master', 'Elo', 'Hiper', 'Amex', 'Outro'].map(b => (
                          <button
                            key={b}
                            onClick={() => setBandeiraCartao(b)}
                            className={`py-2 px-1 rounded-lg border font-bold text-[9px] transition-all ${
                              bandeiraCartao === b
                              ? 'border-teal-500 bg-teal-50 text-teal-600 shadow-sm'
                              : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                            }`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    )}
                 </div>
               )}
            </div>

            <div className="space-y-1.5">
               <label className="text-[10px] font-bold text-slate-400 uppercase">Observações</label>
               <textarea 
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm h-24 focus:ring-2 focus:ring-teal-500/20 outline-none"
                placeholder="As observações serão impressas no demonstrativo de venda ou orçamento."
               />
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleFinalizarVenda}
                  className={`font-bold px-6 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-all text-sm ${
                    metodoPagamento && (!metodoPagamento.includes('Cartão') || (maquininha && bandeiraCartao))
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Registrar recebimento
                </button>
                <button className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold px-6 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-all text-sm">
                  <Check className="w-4 h-4" />
                  Salvar
                </button>
              </div>
              <button className="text-slate-400 hover:text-slate-600 flex items-center gap-1.5 text-sm font-medium transition-all">
                <X className="w-4 h-4" />
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PAINEL DIREITO: APOIO / VENDAS RECENTES */}
      <div className="w-full lg:w-80 p-6 lg:p-8 bg-slate-50 border-l border-slate-200 space-y-6 overflow-y-auto max-h-screen">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-800 px-4 py-2 text-[10px] font-bold text-white uppercase tracking-widest">
            Outros caixas
          </div>
          <div className="p-4 grid grid-cols-2 gap-2">
            {!isPdvMode && (
              <button 
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('mode', 'pdv');
                  url.searchParams.delete('tab');
                  window.open(url.toString(), '_blank', 'noopener,noreferrer');
                }}
                className="bg-teal-500 hover:bg-teal-600 text-white text-[10px] font-bold py-2 rounded shadow-sm transition-all flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" /> Nova aba PDV
              </button>
            )}
            <button 
              onClick={() => setShowFecharModal(true)}
              className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold py-2 rounded shadow-sm transition-all flex items-center justify-center gap-1"
            >
              <Lock className="w-3 h-3" /> Encerrar dia
            </button>
            <button className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-bold py-2 rounded transition-all flex items-center justify-center gap-1 col-span-2 sm:col-span-1">
              <History className="w-3 h-3" /> Histórico
            </button>
          </div>
        </div>

        {/* MODAL FECHAMENTO */}
        {showFecharModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Encerrar Expediente</h3>
                <p className="text-sm text-slate-500">Confira os valores físicos antes de fechar.</p>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase">Total em Vendas</span>
                  <span className="text-lg font-black text-slate-800">
                    R$ {caixa.movimentos
                      .filter(m => m.tipo === 'entrada')
                      .reduce((acc, curr) => acc + parseFloat(curr.valor), 0)
                      .toFixed(2)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Valor Contado em Espécie</label>
                  <input
                    type="number"
                    value={valorContado}
                    onChange={e => setValorContado(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-700 focus:ring-2 focus:ring-red-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Observações do Fecho</label>
                  <textarea
                    value={obsFechamento}
                    onChange={e => setObsFechamento(e.target.value)}
                    placeholder="Ex: Diferença de centavos, sangria realizada..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-700 h-24 focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowFecharModal(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleFecharCaixa}
                  disabled={isClosing}
                  className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {isClosing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirmar Fecho
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1">
          <div className="bg-slate-800 px-4 py-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Vendas</span>
            <button className="text-white hover:rotate-180 transition-transform duration-500"><CheckCircle className="w-3 h-3" /></button>
          </div>
          <div className="p-2 space-y-2">
            <button className="w-full bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold py-2 rounded shadow-sm mb-2">Localizar venda</button>
            
            <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100 text-[10px] font-bold text-slate-500 mb-4">
               <ChevronDown className="w-3 h-3" />
               Últimas 24h
               <ChevronUp className="w-3 h-3" />
            </div>

            <div className="space-y-1">
              {caixa.movimentos.filter(m => m.tipo === 'entrada').reverse().slice(0, 10).map((mov) => (
                <div 
                  key={mov._id} 
                  onClick={() => setSelectedMov(mov)}
                  className="flex items-center justify-between p-3 bg-white border-b border-slate-50 hover:bg-teal-50 transition-all cursor-pointer group"
                >
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-slate-800 uppercase leading-none group-hover:text-teal-600 transition-colors">{mov.descricao.split(' - ')[2] || mov.operador.split(' ')[0]}</p>
                    <p className="text-[9px] text-slate-400 truncate w-32">{mov.descricao}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-300">#{mov._id.slice(-4)}</span>
                    <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                      {parseFloat(mov.valor).toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}
              {caixa.movimentos.filter(m => m.tipo === 'entrada').length === 0 && (
                <div className="py-20 text-center space-y-3">
                   <ShoppingCart className="w-8 h-8 text-slate-200 mx-auto" />
                   <p className="text-[10px] text-slate-400 font-medium">Nenhuma venda hoje</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Caixa;
