import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { AppUser, APP_ID, Hospitalization, ScheduledDose, Product, scheduledDosesCol, stockAlertsCol } from '../../services/dataService';
import { Loader2, Plus, Search, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  hospitalization: Hospitalization;
  userProfile: AppUser | null;
}

const HospitalizationSupplies = ({ hospitalization, userProfile }: Props) => {
  const { t } = useTranslation(['medical', 'common']);
  const [doses, setDoses] = useState<ScheduledDose[]>([]);
  const [loading, setLoading] = useState(true);

  // Add extra supply
  const [showAdd, setShowAdd] = useState(false);
  const [searchSup, setSearchSup] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [adding, setAdding] = useState(false);

  const fetchDoses = async () => {
    try {
      const q = query(scheduledDosesCol(APP_ID), where('hospitalizationId', '==', hospitalization.id), where('status', '==', 'administered'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ScheduledDose));
      
      list.sort((a, b) => {
        const dtA = new Date(a.administeredAt || 0);
        const dtB = new Date(b.administeredAt || 0);
        return dtB.getTime() - dtA.getTime(); // newest first
      });

      setDoses(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoses();
  }, [hospitalization.id]);

  useEffect(() => {
    if (searchSup.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'products'), where('status', '==', 'active'));
        const snap = await getDocs(q);
        const term = searchSup.toLowerCase();
        const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
          .filter(p => p.name.toLowerCase().includes(term))
          .slice(0, 5);
        setSearchResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchSup]);

  const handleAddSupply = async () => {
    if (!selectedProduct) return;
    setAdding(true);
    try {
      const batch = writeBatch(db);
      const now = new Date();
      const nowStr = now.toISOString();

      // 1. Create a dummy administered dose
      const dRef = doc(scheduledDosesCol(APP_ID));
      batch.set(dRef, {
        id: dRef.id,
        prescriptionId: 'manual_supply',
        hospitalizationId: hospitalization.id,
        patientId: hospitalization.patientId,
        patientName: hospitalization.patientName,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        dosage: t('medical:hospitalization.loose', 'Avulso'),
        route: '-',
        scheduledDate: nowStr.split('T')[0],
        scheduledTime: now.toTimeString().substring(0,5),
        status: 'administered',
        administeredAt: nowStr,
        administeredBy: userProfile?.nome,
        administeredById: userProfile?.uid,
        stockDeducted: true,
        quantity: Number(quantity),
        unit: selectedProduct.unit,
        tenantId: APP_ID,
        createdAt: nowStr
      });

      // 2. Deduct stock
      const pRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'products', selectedProduct.id);
      const newStock = (selectedProduct.currentStock || 0) - Number(quantity);
      batch.update(pRef, { currentStock: newStock, updatedAt: nowStr });

      // 3. Alert if needed
      if (newStock < (selectedProduct.minStock || 0)) {
        const alertRef = doc(stockAlertsCol(APP_ID));
        batch.set(alertRef, {
          id: alertRef.id,
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          currentStock: newStock,
          minStock: selectedProduct.minStock || 0,
          alertType: newStock <= 0 ? 'out_of_stock' : 'below_minimum',
          resolvedAt: null,
          createdAt: nowStr
        });
      }

      await batch.commit();
      
      // Cleanup & Refresh
      setSearchSup('');
      setSelectedProduct(null);
      setQuantity('1');
      setShowAdd(false);
      fetchDoses(); // Refresh list

    } catch (err) {
      console.error(err);
      alert(t('medical:hospitalization.error_add_supply', 'Erro ao adicionar insumo.'));
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-teal-500" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">{t('medical:hospitalization.used_supplies', 'Insumos Utilizados')}</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all">
          <Plus className="w-4 h-4" /> {t('medical:hospitalization.add_loose_supply', 'Adicionar Insumo Avulso')}
        </button>
      </div>

      {showAdd && (
        <div className="bg-slate-900/50 p-5 rounded-2xl border border-white/5 space-y-4 animate-in fade-in slide-in-from-top-4">
          {!selectedProduct ? (
            <div className="relative">
              <div className="relative">
                <Search className="w-5 h-5 text-slate-500 absolute left-3 top-2.5" />
                <input type="text" value={searchSup} onChange={e => setSearchSup(e.target.value)} placeholder={t('medical:hospitalization.search_loose_supply', 'Buscar produto avulso...')} className="w-full bg-slate-800 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-white outline-none focus:border-teal-500 text-sm" />
                {searching && <Loader2 className="w-4 h-4 text-teal-500 absolute right-3 top-2.5 animate-spin" />}
              </div>
              {searchResults.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-slate-800 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                  {searchResults.map(p => (
                    <div key={p.id} onClick={() => setSelectedProduct(p)} className="p-3 border-b border-white/5 hover:bg-white/5 cursor-pointer flex justify-between">
                      <span className="font-bold text-white text-sm">{p.name}</span>
                      <span className="text-xs text-slate-400">{t('medical:inventory.stock', 'Estoque')}: {p.currentStock}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-end gap-4">
              <div className="flex-1 bg-teal-500/10 border border-teal-500/20 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-teal-400 font-bold text-sm">{selectedProduct.name}</p>
                  <p className="text-teal-400/70 text-xs">{t('medical:inventory.unit', 'Unidade')}: {selectedProduct.unit}</p>
                </div>
                <button onClick={() => setSelectedProduct(null)} className="text-teal-400 hover:text-teal-300 text-xs font-bold underline">{t('common:change', 'Trocar')}</button>
              </div>
              <div className="w-24">
                <label className="text-xs font-bold text-slate-500 block mb-1">{t('medical:inventory.quantity', 'Quantidade')}</label>
                <input type="number" step="0.1" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full bg-slate-800 border border-white/5 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 text-sm" />
              </div>
              <button onClick={handleAddSupply} disabled={adding} className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-bold transition-all h-[38px] flex items-center justify-center min-w-[100px]">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common:confirm', 'Confirmar')}
              </button>
            </div>
          )}
        </div>
      )}

      {doses.length === 0 ? (
        <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-12 text-center">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">{t('medical:hospitalization.empty_supplies', 'Nenhum insumo ou medicação administrada ainda.')}</p>
        </div>
      ) : (
        <div className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400 bg-slate-900/80 border-b border-white/5">
              <tr>
                <th className="p-4 font-medium">{t('medical:hospitalization.date_time', 'Data / Hora')}</th>
                <th className="p-4 font-medium">{t('medical:hospitalization.product', 'Produto')}</th>
                <th className="p-4 font-medium">{t('medical:hospitalization.qty', 'Qtd')}</th>
                <th className="p-4 font-medium">{t('medical:hospitalization.responsible', 'Responsável')}</th>
              </tr>
            </thead>
            <tbody className="text-slate-300 divide-y divide-white/5">
              {doses.map(d => {
                const dateObj = new Date(d.administeredAt || d.createdAt);
                return (
                  <tr key={d.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 whitespace-nowrap font-mono text-xs">{dateObj.toLocaleDateString()} {dateObj.toTimeString().substring(0,5)}</td>
                    <td className="p-4">
                      <p className="text-white font-medium">{d.productName}</p>
                      <p className="text-xs text-slate-500">{d.dosage !== t('medical:hospitalization.loose', 'Avulso') ? t('medical:hospitalization.prescription_label', 'Prescrição') : t('medical:hospitalization.loose', 'Avulso')}</p>
                    </td>
                    <td className="p-4 font-mono">{d.quantity || 1} {d.unit || ''}</td>
                    <td className="p-4 text-xs">{d.administeredBy}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default HospitalizationSupplies;
