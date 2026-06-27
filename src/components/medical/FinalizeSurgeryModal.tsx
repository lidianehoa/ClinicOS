import { useState, useEffect } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { APP_ID, Surgery, SurgicalSupplyUsed, AnesthesiaMedication, Product, completeSurgery } from '../../services/dataService';
import { X, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  surgery: Surgery;
  operatorName: string;
  onCancel: () => void;
  onSuccess: () => void;
}

interface StockItem {
  name: string;
  quantity: number;
  unit: string;
  currentStock: number;
  minStock: number;
  newStock: number;
  belowMin: boolean;
}

const FinalizeSurgeryModal = ({ surgery, operatorName, onCancel, onSuccess }: Props) => {
  const { t } = useTranslation(['medical', 'common']);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const buildStockPreview = async () => {
      setLoading(true);
      try {
        // Collect all items that reference products with productId
        const anesthMeds: AnesthesiaMedication[] = [
          ...(surgery.anesthesia?.mpa || []),
          ...(surgery.anesthesia?.induction || []),
          ...(surgery.anesthesia?.maintenanceMedications || []),
          ...(surgery.anesthesia?.analgesia || []),
        ];

        type RawItem = { productId: string; quantity: number; name: string; unit: string };
        const rawItems: RawItem[] = [];

        for (const med of anesthMeds) {
          if (med.productId && med.quantity) {
            rawItems.push({ productId: med.productId, quantity: med.quantity, name: med.productName, unit: med.unit || '' });
          }
        }
        for (const sup of (surgery.suppliesUsed || []) as SurgicalSupplyUsed[]) {
          if (sup.productId && sup.quantity) {
            rawItems.push({ productId: sup.productId, quantity: sup.quantity, name: sup.productName, unit: sup.unit });
          }
        }

        // Fetch current stock for each unique product
        const seen = new Set<string>();
        const items: StockItem[] = [];
        for (const item of rawItems) {
          if (seen.has(item.productId)) continue;
          seen.add(item.productId);

          const pRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'products', item.productId);
          const pSnap = await getDoc(pRef);
          if (pSnap.exists()) {
            const p = pSnap.data() as Product;
            const totalQty = rawItems.filter(ri => ri.productId === item.productId).reduce((s, ri) => s + ri.quantity, 0);
            const newStock = (p.currentStock || 0) - totalQty;
            items.push({
              name: p.name,
              quantity: totalQty,
              unit: item.unit || p.unit,
              currentStock: p.currentStock || 0,
              minStock: p.minStock || 0,
              newStock,
              belowMin: newStock < (p.minStock || 0),
            });
          }
        }
        setStockItems(items);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    buildStockPreview();
  }, [surgery]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await completeSurgery(surgery, operatorName);
      onSuccess();
    } catch (err) {
      console.error(err);
      alert(t('medical:surgeries.error_finalize_surgery', 'Erro ao finalizar cirurgia. Tente novamente.'));
      setConfirming(false);
    }
  };

  const warnings = stockItems.filter(i => i.belowMin);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">

        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">{t('medical:surgeries.confirm_surgery_completion', 'Confirmar finalização da cirurgia')}</h2>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
            </div>
          ) : (
            <>
              <p className="text-slate-300 text-sm">
                {t('medical:surgeries.supplies_deduction_msg', 'Os seguintes insumos serão')} <strong className="text-white">{t('medical:surgeries.deducted_from_stock', 'baixados do estoque')}</strong> {t('medical:surgeries.upon_confirmation', 'ao confirmar:')}
              </p>

              {stockItems.length === 0 ? (
                <div className="bg-slate-900/50 rounded-xl border border-white/5 p-6 text-center">
                  <p className="text-slate-400 text-sm">{t('medical:surgeries.no_stock_deduction_items', 'Nenhum insumo com produto vinculado para baixa de estoque.')}</p>
                </div>
              ) : (
                <div className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="text-slate-400 bg-slate-900/80 border-b border-white/5">
                      <tr>
                        <th className="p-3 font-medium">{t('medical:surgeries.product', 'Produto')}</th>
                        <th className="p-3 font-medium">{t('medical:surgeries.qty', 'Qtd')}</th>
                        <th className="p-3 font-medium">{t('medical:surgeries.current_stock', 'Estoque atual')}</th>
                        <th className="p-3 font-medium">{t('medical:surgeries.after_deduction', 'Após baixa')}</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300 divide-y divide-white/5">
                      {stockItems.map((item, i) => (
                        <tr key={i} className={item.belowMin ? 'bg-amber-500/5' : ''}>
                          <td className="p-3 font-medium text-white flex items-center gap-2">
                            {item.name}
                            {item.belowMin && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          </td>
                          <td className="p-3 font-mono">{item.quantity} {item.unit}</td>
                          <td className="p-3 font-mono">{item.currentStock} {item.unit}</td>
                          <td className={`p-3 font-bold font-mono ${item.newStock < 0 ? 'text-red-400' : item.belowMin ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {item.newStock} {item.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {warnings.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-1">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    {t('medical:surgeries.below_min_stock_warning', 'Atenção — produtos que ficarão abaixo do estoque mínimo:')}
                  </div>
                  {warnings.map((w, i) => (
                    <p key={i} className="text-amber-300 text-sm">
                      • <strong>{w.name}</strong>: {t('medical:surgeries.will_be_left_with', 'ficará com')} {w.newStock} {w.unit} ({t('medical:surgeries.minimum', 'mínimo:')} {w.minStock} {w.unit})
                    </p>
                  ))}
                </div>
              )}

              <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4">
                <p className="text-slate-400 text-sm">{t('medical:surgeries.actions_upon_confirmation', 'Ao confirmar, também serão executadas as seguintes ações:')}</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-400 list-disc list-inside">
                  <li>{t('medical:surgeries.status_change_completed_prefix', 'Status da cirurgia será alterado para')} <strong className="text-emerald-400">{t('medical:surgeries.status_change_completed_suffix', 'Concluída')}</strong></li>
                  <li>{t('medical:surgeries.timeline_event_registered', 'Evento será registrado na linha do tempo do paciente')}</li>
                  {surgery.postOp?.returnDate && (
                    <li>{t('medical:surgeries.return_schedule_created', 'Agendamento de retorno será criado para')} <strong className="text-teal-400">{surgery.postOp.returnDate.split('-').reverse().join('/')}</strong></li>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-white/5 flex items-center justify-end gap-3 shrink-0 bg-slate-900/50">
          <button onClick={onCancel} disabled={confirming} className="px-5 py-2.5 rounded-xl font-bold text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            {t('common:cancel', 'Cancelar')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming || loading}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            {confirming ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
            {t('medical:surgeries.confirm_and_deduct', 'Confirmar e Dar Baixa no Estoque')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinalizeSurgeryModal;
