import { useState, useEffect } from 'react';
import { Search, Filter, Plus, Upload, Package, Edit, Trash2 } from 'lucide-react';
import { Product, subscribeProducts, APP_ID, productDoc } from '../../services/dataService';
import { deleteDoc, setDoc } from 'firebase/firestore';
import ProductModal from './ProductModal';
import ImportCSVModal from './ImportCSVModal';
import { useTranslation } from 'react-i18next';

const Products = () => {
  const { t } = useTranslation(['products', 'common']);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState('All');
  const [filterType, setFilterType] = useState('All');
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const [page, setPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    const unsub = subscribeProducts((data) => {
      setProducts(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSaveProduct = async (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>) => {
    try {
      const id = selectedProduct ? selectedProduct.id : `prod_${Date.now()}`;
      const docRef = productDoc(id, APP_ID);
      await setDoc(docRef, { ...data, tenantId: APP_ID }, { merge: true });
      setIsProductModalOpen(false);
      setSelectedProduct(undefined);
    } catch (err) {
      console.error(err);
      alert(t('products:error_save', 'Erro ao salvar o produto.'));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('products:confirm_delete', 'Tem certeza que deseja excluir este produto?'))) {
      try {
        await deleteDoc(productDoc(id, APP_ID));
      } catch (err) {
        console.error(err);
        alert(t('products:error_delete', 'Erro ao deletar o produto.'));
      }
    }
  };

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (p.internalCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (p.barcode || '').includes(searchQuery);
    const matchGroup = filterGroup === 'All' || p.group === filterGroup;
    const matchType = filterType === 'All' || p.type === filterType;
    return matchSearch && matchGroup && matchType;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const groups = Array.from(new Set(products.map(p => p.group))).filter(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-white/50">
        <Package className="w-8 h-8 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary border border-primary/30">
              <Package className="w-5 h-5" />
            </div>
            {t('products:title', 'Produtos & Serviços')}
          </h1>
          <p className="text-white/50 mt-1">{t('products:subtitle', 'Gerencie o portfólio da clínica, preços e controle de estoque.')}</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl border border-white/10 transition-all"
          >
            <Upload className="w-4 h-4" />
            {t('products:import_csv', 'Importar CSV')}
          </button>
          <button 
            onClick={() => { setSelectedProduct(undefined); setIsProductModalOpen(true); }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-pink-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            {t('common:add', 'Adicionar')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-base border border-white/10 p-4 rounded-2xl flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <input 
            type="text" 
            placeholder={t('products:search_placeholder', 'Buscar por nome, código ou EAN...')} 
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white outline-none focus:border-primary/50 text-sm"
          />
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3">
            <Filter className="w-4 h-4 text-white/40" />
            <select 
              value={filterGroup} 
              onChange={e => { setFilterGroup(e.target.value); setPage(1); }}
              className="bg-transparent text-white text-sm outline-none py-2 cursor-pointer"
            >
              <option value="All" className="bg-base">{t('products:all_groups', 'Todos os Grupos')}</option>
              {groups.map(g => (
                <option key={g} value={g} className="bg-base">{g}</option>
              ))}
            </select>
          </div>
          <select 
            value={filterType} 
            onChange={e => { setFilterType(e.target.value); setPage(1); }}
            className="bg-white/5 border border-white/10 text-white text-sm outline-none px-3 py-2 rounded-xl cursor-pointer"
          >
            <option value="All" className="bg-base">{t('products:type_all', 'Tipo: Todos')}</option>
            <option value="product" className="bg-base">{t('products:type_products', 'Apenas Produtos')}</option>
            <option value="service" className="bg-base">{t('products:type_services', 'Apenas Serviços')}</option>
          </select>
        </div>
      </div>

      {/* Table List */}
      <div className="flex-1 bg-base border border-white/10 rounded-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white/5 text-white/40 font-bold uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="px-6 py-4">Código / Nome</th>
                <th className="px-6 py-4">Grupo</th>
                <th className="px-6 py-4 text-right">Preço (R$)</th>
                <th className="px-6 py-4 text-center">Estoque</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-white/40">
                    {t('products:empty', 'Nenhum produto encontrado.')}
                  </td>
                </tr>
              ) : (
                paginated.map(p => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                          {p.type === 'service' ? (
                            <span className="text-[10px] font-bold text-teal-400">SRV</span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-400">PRD</span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white flex items-center gap-2">
                            {p.name}
                            {p.barcode && <span title="Possui código de barras" className="text-emerald-400 text-[10px]">🔲</span>}
                          </p>
                          <p className="text-xs text-white/40 font-mono">{p.internalCode || 'S/ Cód'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-white/70">{p.group || '—'}</td>
                    <td className="px-6 py-3 text-right">
                      {p.salePrice > 0 ? (
                        <span className="font-bold text-white">
                          R$ {p.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-white/10 text-white/50 text-[10px] font-bold rounded-md uppercase tracking-wide">Uso Interno</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {!p.controlsStock ? (
                        <span className="text-white/30 text-xs">—</span>
                      ) : (
                        <span className={`font-bold ${(p.currentStock || 0) < 0 ? 'text-red-400' : (p.currentStock === 0 ? 'text-amber-400' : 'text-emerald-400')}`}>
                          {p.currentStock || 0}
                          {p.currentStock === 0 && <span className="ml-2 px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded text-[9px] uppercase tracking-wider">Zerado</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {p.status === 'active' ? (
                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full border border-emerald-500/20">Ativo</span>
                      ) : (
                        <span className="px-2 py-1 bg-white/5 text-white/40 text-xs rounded-full border border-white/10">Inativo</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setSelectedProduct(p); setIsProductModalOpen(true); }}
                          className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 text-white/50 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between text-sm text-white/50">
          <span>{t('products:showing_items', 'Mostrando {{count}} de {{total}} itens', { count: paginated.length, total: filtered.length })}</span>
          <div className="flex items-center gap-4">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="hover:text-white disabled:opacity-30 disabled:hover:text-white/50 transition-colors"
            >
              {t('common:previous', 'Anterior')}
            </button>
            <span className="font-mono">{page} / {totalPages || 1}</span>
            <button 
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="hover:text-white disabled:opacity-30 disabled:hover:text-white/50 transition-colors"
            >
              {t('common:next', 'Próxima')}
            </button>
          </div>
        </div>
      </div>

      {isProductModalOpen && (
        <ProductModal 
          product={selectedProduct}
          onClose={() => setIsProductModalOpen(false)}
          onSave={handleSaveProduct}
        />
      )}

      {isImportModalOpen && (
        <ImportCSVModal 
          tenantId={APP_ID}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => setIsImportModalOpen(false)}
        />
      )}
    </div>
  );
};

export default Products;
