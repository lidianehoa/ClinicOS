import { useState, useEffect, useMemo } from 'react';
import { 
  ArrowDownCircle, Plus, Search, Calendar, Check, X, Trash2, Edit
} from 'lucide-react';
import { 
  subscribeContasReceber, saveContaReceber, deleteContaReceber, quitarContaReceber,
  subscribeCategoriasFinanceiras, saveCategoriaFinanceira,
  ContaReceber, CategoriaFinanceira, subscribeCaixa, CaixaDia
} from '../../services/dataService';

export default function ContasReceberPage() {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [caixaDia, setCaixaDia] = useState<CaixaDia | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [showModal, setShowModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  
  const [editingConta, setEditingConta] = useState<Partial<ContaReceber> | null>(null);
  const [newCatName, setNewCatName] = useState('');

  // Pega a data de hoje para vincular ao caixa
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const unsubContas = subscribeContasReceber((data) => {
      setContas(data);
      setLoading(false);
    });
    
    const unsubCat = subscribeCategoriasFinanceiras((data) => {
      setCategorias(data.filter(c => c.tipo === 'receita'));
    });

    const unsubCaixa = subscribeCaixa(todayStr, (data) => {
      setCaixaDia(data);
    });

    return () => {
      unsubContas();
      unsubCat();
      unsubCaixa();
    };
  }, [todayStr]);

  const filteredContas = useMemo(() => {
    return contas.filter(c => {
      const matchSearch = c.descricao.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.clienteNome || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [contas, searchTerm, statusFilter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConta?.descricao || !editingConta.valor || !editingConta.dataVencimento) return;
    
    await saveContaReceber({
      ...editingConta,
      status: editingConta.status || 'pendente',
      criadoPor: 'Sistema'
    });
    setShowModal(false);
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    await saveCategoriaFinanceira({
      nome: newCatName,
      tipo: 'receita',
      cor: '#10b981' // green default
    });
    setNewCatName('');
    setShowCatModal(false);
  };

  const handleQuitar = async (conta: ContaReceber) => {
    if (caixaDia?.status !== 'aberto') {
      alert('É necessário ter um Caixa aberto no dia de hoje para receber essa conta.');
      return;
    }
    if (confirm(`Confirma o recebimento de ${conta.descricao} no valor de R$ ${conta.valor}? Isso entrará no caixa de hoje.`)) {
      await quitarContaReceber(conta, todayStr, 'Sistema');
    }
  };

  return (
    <div className="h-full bg-base overflow-y-auto">
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <ArrowDownCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h1 className="text-3xl font-bold text-white">Contas a Receber</h1>
            </div>
            <p className="text-purple-200">
              Acompanhe recebimentos futuros, pagamentos parcelados e pendências de clientes.
            </p>
          </div>
          
          <button 
            onClick={() => {
              setEditingConta({ dataVencimento: todayStr, valor: 0 });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            Nova Conta a Receber
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input 
              type="text"
              placeholder="Buscar por descrição ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all" className="bg-slate-800">Todos os Status</option>
              <option value="pendente" className="bg-slate-800">Pendentes</option>
              <option value="recebido" className="bg-slate-800">Recebidos</option>
              <option value="atrasado" className="bg-slate-800">Atrasados</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredContas.length === 0 ? (
            <div className="p-12 text-center text-white/50">
              Nenhuma conta encontrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/20 text-white/60 text-sm">
                    <th className="px-6 py-4 font-medium">Vencimento</th>
                    <th className="px-6 py-4 font-medium">Descrição</th>
                    <th className="px-6 py-4 font-medium">Categoria</th>
                    <th className="px-6 py-4 font-medium">Valor</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white">
                  {filteredContas.map(conta => (
                    <tr key={conta.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-white/40" />
                          {new Date(conta.dataVencimento || conta.vencimento).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{conta.descricao}</div>
                        {conta.clienteNome && <div className="text-xs text-white/40">{conta.clienteNome}</div>}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 bg-white/5 rounded-lg text-white/70">
                          {conta.categoriaNome || 'Sem Categoria'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold">
                        R$ {Number(conta.valor).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          conta.status === 'recebido' ? 'bg-green-500/20 text-green-400' :
                          conta.status === 'atrasado' ? 'bg-red-500/20 text-red-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {conta.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {conta.status !== 'recebido' && (
                            <button 
                              onClick={() => handleQuitar(conta)}
                              className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors"
                              title="Receber Conta"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => { setEditingConta(conta); setShowModal(true); }}
                            className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => { if(confirm('Tem certeza?')) deleteContaReceber(conta.id); }}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nova/Editar Conta */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">
                {editingConta?.id ? 'Editar Recebimento' : 'Nova Conta a Receber'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-white/50 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="conta-form" onSubmit={handleSave} className="space-y-4">
                
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Descrição</label>
                  <input 
                    type="text" 
                    required
                    value={editingConta?.descricao || ''}
                    onChange={(e) => setEditingConta(prev => ({...prev, descricao: e.target.value}))}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ex: Pagamento Consulta"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-white/70 mb-1">Valor (R$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={editingConta?.valor || ''}
                      onChange={(e) => setEditingConta(prev => ({...prev, valor: parseFloat(e.target.value)}))}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-white/70 mb-1">Vencimento</label>
                    <input 
                      type="date" 
                      required
                      value={editingConta?.dataVencimento || ''}
                      onChange={(e) => setEditingConta(prev => ({...prev, dataVencimento: e.target.value}))}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Categoria</label>
                  <div className="flex gap-2">
                    <select
                      value={editingConta?.categoriaId || ''}
                      onChange={(e) => {
                        const cat = categorias.find(c => c.id === e.target.value);
                        setEditingConta(prev => ({
                          ...prev, 
                          categoriaId: cat?.id,
                          categoriaNome: cat?.nome || ''
                        }));
                      }}
                      className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="" className="bg-slate-800">Selecione...</option>
                      {categorias.map(c => (
                        <option key={c.id} value={c.id} className="bg-slate-800">{c.nome}</option>
                      ))}
                    </select>
                    <button 
                      type="button"
                      onClick={() => setShowCatModal(true)}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                      title="Nova Categoria"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Cliente (Opcional)</label>
                  <input 
                    type="text" 
                    value={editingConta?.clienteNome || ''}
                    onChange={(e) => setEditingConta(prev => ({...prev, clienteNome: e.target.value}))}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Observações</label>
                  <textarea 
                    value={editingConta?.observacoes || ''}
                    onChange={(e) => setEditingConta(prev => ({...prev, observacoes: e.target.value}))}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 min-h-[80px]"
                  />
                </div>

              </form>
            </div>
            
            <div className="p-6 border-t border-white/10 flex justify-end gap-3">
              <button 
                onClick={() => setShowModal(false)}
                className="px-6 py-2 rounded-xl text-white font-medium hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="conta-form"
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-white font-bold shadow-lg transition-all"
              >
                Salvar Conta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Categoria */}
      {showCatModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-sm">
            <div className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">Nova Categoria</h3>
              <input 
                type="text"
                autoFocus
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Ex: Consulta"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 mb-4"
              />
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => setShowCatModal(false)}
                  className="px-4 py-2 rounded-lg text-white/70 hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white font-bold"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
