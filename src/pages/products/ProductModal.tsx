import { useState, useEffect } from 'react';
import { Product } from '../../services/dataService';
import { useTranslation } from 'react-i18next';
import { X, Check } from 'lucide-react';

interface Props {
  product?: Product;
  onSave: (p: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>) => void;
  onClose: () => void;
}

type Tab = 'basic' | 'price' | 'fiscal';

const ProductModal = ({ product, onSave, onClose }: Props) => {
  const { t } = useTranslation(['products', 'common']);
  const [activeTab, setActiveTab] = useState<Tab>('basic');
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    internalCode: '',
    type: 'product',
    group: 'Outros',
    brand: '',
    unit: 'UN',
    purpose: '',
    status: 'active',
    costPrice: 0,
    salePrice: 0,
    commission: 0,
    controlsStock: false,
    currentStock: 0,
    minStock: 0,
    maxStock: 0,
    expiryDate: '',
    supplier: '',
    lastPurchaseDate: '',
    barcode: '',
    ncmCode: '',
    anvisaCode: '',
    taxProfile: '',
    acquisitionForm: '',
    taxSituation: '',
    aliquot: '',
    merchandiseOrigin: '',
    cest: ''
  });

  useEffect(() => {
    if (product) {
      setFormData(product);
    }
  }, [product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.name.trim() === '') {
      alert(t('products:modal.name_required', 'O nome do produto é obrigatório.'));
      return;
    }
    
    onSave(formData as Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-base border border-white/10 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">
            {product ? t('products:modal.edit_product', 'Editar Produto') : t('products:modal.new_product', 'Novo Produto')}
          </h2>
          <button onClick={onClose} className="p-2 text-white/50 hover:bg-white/10 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-6">
          <button 
            onClick={() => setActiveTab('basic')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'basic' ? 'border-primary text-primary' : 'border-transparent text-white/60 hover:text-white'}`}
          >
            {t('products:modal.tab_basic', 'Básico')}
          </button>
          <button 
            onClick={() => setActiveTab('price')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'price' ? 'border-primary text-primary' : 'border-transparent text-white/60 hover:text-white'}`}
          >
            {t('products:modal.tab_price', 'Preços e Estoque')}
          </button>
          <button 
            onClick={() => setActiveTab('fiscal')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'fiscal' ? 'border-primary text-primary' : 'border-transparent text-white/60 hover:text-white'}`}
          >
            {t('products:modal.tab_fiscal', 'Fiscal e Códigos')}
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {activeTab === 'basic' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-4">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase">Nome *</label>
                <input required type="text" name="name" value={formData.name || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase">Código Interno</label>
                <input type="text" name="internalCode" value={formData.internalCode || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase">Tipo</label>
                <select name="type" value={formData.type || 'product'} onChange={handleChange} className="w-full bg-[#1A1A2E] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50">
                  <option value="product">Produto</option>
                  <option value="service">Serviço</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase">Grupo</label>
                <input type="text" name="group" value={formData.group || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase">Marca</label>
                <input type="text" name="brand" value={formData.brand || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase">Unidade</label>
                <select name="unit" value={formData.unit || 'UN'} onChange={handleChange} className="w-full bg-[#1A1A2E] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50">
                  <option value="UN">Unidade (UN)</option>
                  <option value="ML">Mililitro (ML)</option>
                  <option value="CX">Caixa (CX)</option>
                  <option value="FR">Frasco (FR)</option>
                  <option value="PCT">Pacote (PCT)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase">Propósito</label>
                <select name="purpose" value={formData.purpose || ''} onChange={handleChange} className="w-full bg-[#1A1A2E] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50">
                  <option value="">(Selecione)</option>
                  <option value="Apenas venda">Apenas venda</option>
                  <option value="Venda e consumo interno">Venda e consumo interno</option>
                  <option value="Apenas consumo interno">Apenas consumo interno</option>
                </select>
              </div>
              <div className="space-y-1 flex items-center gap-3 sm:col-span-2 pt-2">
                <input type="checkbox" id="status" name="status" checked={formData.status === 'active'} onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.checked ? 'active' : 'inactive' }))} className="w-5 h-5 rounded border-white/20 text-primary focus:ring-primary/50 bg-white/5" />
                <label htmlFor="status" className="text-sm font-medium text-white cursor-pointer">Produto Ativo</label>
              </div>
            </div>
          )}

          {activeTab === 'price' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase">Preço de Custo (R$)</label>
                <input type="number" step="0.01" name="costPrice" value={formData.costPrice || 0} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase">Preço de Venda (R$)</label>
                <input type="number" step="0.01" name="salePrice" value={formData.salePrice || 0} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase">Comissão Padrão (%)</label>
                <input type="number" step="0.01" name="commission" value={formData.commission || 0} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50" />
              </div>
              
              <div className="sm:col-span-2 border-t border-white/10 my-2"></div>

              <div className="space-y-1 flex items-center gap-3 sm:col-span-2">
                <input type="checkbox" id="controlsStock" name="controlsStock" checked={formData.controlsStock || false} onChange={handleChange} className="w-5 h-5 rounded border-white/20 text-primary focus:ring-primary/50 bg-white/5" />
                <label htmlFor="controlsStock" className="text-sm font-medium text-white cursor-pointer">Controlar Estoque</label>
              </div>

              {formData.controlsStock && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-white/40 uppercase">Estoque Atual</label>
                    <input type="number" name="currentStock" value={formData.currentStock || 0} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-white/40 uppercase">Validade</label>
                    <input type="date" name="expiryDate" value={formData.expiryDate || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-white/40 uppercase">Estoque Mínimo</label>
                    <input type="number" name="minStock" value={formData.minStock || 0} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-white/40 uppercase">Estoque Máximo</label>
                    <input type="number" name="maxStock" value={formData.maxStock || 0} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50" />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase">Fornecedor</label>
                <input type="text" name="supplier" value={formData.supplier || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase">Última Compra</label>
                <input type="date" name="lastPurchaseDate" value={formData.lastPurchaseDate || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50" />
              </div>
            </div>
          )}

          {activeTab === 'fiscal' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-4">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase">Código de Barras (EAN-13)</label>
                <input type="text" name="barcode" value={formData.barcode || ''} onChange={handleChange} placeholder="Escaneie ou digite o código" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50 font-mono tracking-wider" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase">Código NCM</label>
                <input type="text" name="ncmCode" value={formData.ncmCode || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase">Registro ANVISA</label>
                <input type="text" name="anvisaCode" value={formData.anvisaCode || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50" />
              </div>
              
              <div className="sm:col-span-2 border-t border-white/10 my-2"></div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase">Perfil Tributário</label>
                <input type="text" name="taxProfile" value={formData.taxProfile || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase">Forma de Aquisição</label>
                <input type="text" name="acquisitionForm" value={formData.acquisitionForm || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase">Situação Tributária</label>
                <input type="text" name="taxSituation" value={formData.taxSituation || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase">Alíquota</label>
                <input type="text" name="aliquot" value={formData.aliquot || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase">CSTICMS</label>
                <input type="text" name="csticms" value={formData.csticms || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase">Origem</label>
                <input type="text" name="merchandiseOrigin" value={formData.merchandiseOrigin || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase">CEST</label>
                <input type="text" name="cest" value={formData.cest || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary/50" />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-white/10 mt-6">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all">
              {t('common:cancel', 'Cancelar')}
            </button>
            <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-pink-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20">
              <Check className="w-4 h-4" />
              {t('common:save', 'Salvar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;
