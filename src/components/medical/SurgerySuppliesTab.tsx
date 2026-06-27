import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { APP_ID, Surgery, SurgicalSupplyUsed, Product } from '../../services/dataService';
import { Plus, X, Search, Loader2, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  surgery: Surgery;
  onUpdate: (supplies: SurgicalSupplyUsed[]) => void;
  disabled?: boolean;
}

const CATEGORIES: { value: SurgicalSupplyUsed['category'], label: string }[] = [
  { value: 'anesthesia', label: 'Anestesia' },
  { value: 'surgical_material', label: 'Material Cirúrgico' },
  { value: 'medication', label: 'Medicamento' },
  { value: 'other', label: 'Outro' },
];

const SurgerySuppliesTab = ({ surgery, onUpdate, disabled }: Props) => {
  const { t } = useTranslation(['medical', 'common']);
  const supplies = surgery.suppliesUsed || [];

  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [category, setCategory] = useState<SurgicalSupplyUsed['category']>('other');
  const [manualName, setManualName] = useState('');
  const [manualUnit, setManualUnit] = useState('UN');
  const [manualCost, setManualCost] = useState('0');
  const [filterCat, setFilterCat] = useState<string>('all');

  useEffect(() => {
    if (searchTerm.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'products'), where('status', '==', 'active'));
        const snap = await getDocs(q);
        const term = searchTerm.toLowerCase();
        setSearchResults(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)).filter(p => p.name.toLowerCase().includes(term)).slice(0, 6));
      } catch (err) { console.error(err); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleAdd = () => {
    const name = selectedProduct ? selectedProduct.name : manualName;
    if (!name) return;

    const qty = Number(quantity) || 1;
    const cost = selectedProduct ? (selectedProduct.costPrice || 0) : Number(manualCost) || 0;

    const newSupply: SurgicalSupplyUsed = {
      productId: selectedProduct?.id,
      productName: name,
      quantity: qty,
      unit: selectedProduct ? selectedProduct.unit : manualUnit,
      unitCost: cost,
      totalCost: cost * qty,
      category,
    };
    onUpdate([...supplies, newSupply]);
    // Reset
    setSelectedProduct(null);
    setManualName('');
    setManualCost('0');
    setQuantity('1');
    setSearchTerm('');
    setShowAdd(false);
  };

  const remove = (idx: number) => {
    const next = [...supplies];
    next.splice(idx, 1);
    onUpdate(next);
  };

  const total = supplies.reduce((sum, s) => sum + (s.totalCost || 0), 0);

  const grouped: Record<string, SurgicalSupplyUsed[]> = {};
  for (const s of supplies) {
    const cat = s.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  }

  const filtered = filterCat === 'all' ? supplies : supplies.filter(s => (s.category || 'other') === filterCat);

  const catLabel = (cat: string) => {
    switch (cat) {
      case 'anesthesia': return t('medical:surgeries.categories.anesthesia', 'Anestesia');
      case 'surgical_material': return t('medical:surgeries.categories.surgical_material', 'Material Cirúrgico');
      case 'medication': return t('medical:surgeries.categories.medication', 'Medicamento');
      default: return t('medical:surgeries.categories.other', 'Outro');
    }
  };

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">{t('medical:surgeries.surgical_supplies_materials', 'Insumos e Materiais Cirúrgicos')}</h3>
          <p className="text-slate-400 text-sm mt-0.5">{supplies.length} {t('medical:surgeries.items', 'item(s)')} • {t('medical:surgeries.total', 'Total')}: <span className="text-emerald-400 font-bold">R$ {total.toFixed(2)}</span></p>
        </div>
        {!disabled && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-teal-500/20 text-sm"
          >
            <Plus className="w-4 h-4" /> {t('medical:surgeries.add_supply', 'Adicionar Insumo')}
          </button>
        )}
      </div>

      {/* ADD FORM */}
      {showAdd && (
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-4">
          <div>
            {!selectedProduct ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder={t('medical:surgeries.search_product_name', 'Buscar produto por nome...')}
                    className="w-full bg-slate-800 border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-white outline-none focus:border-teal-500 text-sm"
                    autoFocus
                  />
                  {searching && <Loader2 className="w-4 h-4 text-teal-500 absolute right-3 top-2.5 animate-spin" />}
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 top-full mt-1 w-full bg-slate-800 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                      {searchResults.map(p => (
                        <div key={p.id} onClick={() => { setSelectedProduct(p); setSearchTerm(''); setSearchResults([]); }} className="p-3 border-b border-white/5 hover:bg-white/5 cursor-pointer flex justify-between items-center">
                          <p className="font-bold text-white text-sm">{p.name}</p>
                          <p className="text-xs text-slate-400">{t('medical:inventory.stock', 'Estoque')}: {p.currentStock} {p.unit}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500">{t('medical:surgeries.or_add_manually', 'Ou adicione manualmente:')}</p>
                <input type="text" value={manualName} onChange={e => setManualName(e.target.value)} placeholder={t('medical:surgeries.supply_name_placeholder', 'Nome do insumo...')} className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500 text-sm" />
              </div>
            ) : (
              <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-3 flex justify-between items-center">
                <p className="text-teal-400 font-bold text-sm">{selectedProduct.name}</p>
                <button onClick={() => setSelectedProduct(null)} className="text-xs text-teal-400 underline">{t('common:change', 'Trocar')}</button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400">{t('common:category', 'Categoria')}</label>
              <select value={category} onChange={e => setCategory(e.target.value as any)} className="w-full bg-slate-800 border border-white/5 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 text-sm">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{catLabel(c.value || '')}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400">{t('medical:inventory.quantity', 'Quantidade')}</label>
              <input type="number" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full bg-slate-800 border border-white/5 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 text-sm" />
            </div>
            {!selectedProduct && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400">{t('medical:inventory.unit', 'Unidade')}</label>
                  <input type="text" value={manualUnit} onChange={e => setManualUnit(e.target.value)} className="w-full bg-slate-800 border border-white/5 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400">{t('medical:surgeries.unit_cost', 'Custo unit. (R$)')}</label>
                  <input type="number" step="0.01" value={manualCost} onChange={e => setManualCost(e.target.value)} className="w-full bg-slate-800 border border-white/5 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 text-sm" />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-slate-400 hover:text-white font-bold transition-colors text-sm">{t('common:cancel', 'Cancelar')}</button>
            <button onClick={handleAdd} disabled={!selectedProduct && !manualName} className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-bold transition-all text-sm">
              {t('common:add', 'Adicionar')}
            </button>
          </div>
        </div>
      )}

      {/* FILTER */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterCat('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterCat === 'all' ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{t('common:all', 'Todos')}</button>
        {CATEGORIES.map(c => (
          <button key={c.value} onClick={() => setFilterCat(c.value!)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterCat === c.value ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{catLabel(c.value || '')}</button>
        ))}
      </div>

      {/* TABLE */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-12 text-center">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">{t('medical:surgeries.no_supplies', 'Nenhum insumo adicionado.')}</p>
        </div>
      ) : (
        <div className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400 bg-slate-900/80 border-b border-white/5">
              <tr>
                <th className="p-4 font-medium">{t('medical:surgeries.product', 'Produto')}</th>
                <th className="p-4 font-medium">{t('common:category', 'Categoria')}</th>
                <th className="p-4 font-medium">{t('medical:surgeries.qty', 'Qtd')}</th>
                <th className="p-4 font-medium">{t('medical:surgeries.unit_cost_table', 'Custo Unit.')}</th>
                <th className="p-4 font-medium">{t('medical:surgeries.total', 'Total')}</th>
                {!disabled && <th className="p-4" />}
              </tr>
            </thead>
            <tbody className="text-slate-300 divide-y divide-white/5">
              {filtered.map((s, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-medium text-white">{s.productName}</td>
                  <td className="p-4">
                    <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-xs font-bold">{catLabel(s.category || 'other')}</span>
                  </td>
                  <td className="p-4 font-mono">{s.quantity} {s.unit}</td>
                  <td className="p-4 font-mono text-slate-400">R$ {(s.unitCost || 0).toFixed(2)}</td>
                  <td className="p-4 font-bold font-mono text-emerald-400">R$ {(s.totalCost || 0).toFixed(2)}</td>
                  {!disabled && (
                    <td className="p-4 text-right">
                      <button onClick={() => remove(supplies.indexOf(s))} className="text-slate-500 hover:text-red-400 p-1 rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-white/10 bg-slate-900/80">
              <tr>
                <td colSpan={4} className="p-4 text-right text-sm font-bold text-slate-400">{t('medical:surgeries.total_supplies_label', 'Total de insumos:')}</td>
                <td className="p-4 font-bold text-lg text-emerald-400 font-mono">R$ {total.toFixed(2)}</td>
                {!disabled && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default SurgerySuppliesTab;
