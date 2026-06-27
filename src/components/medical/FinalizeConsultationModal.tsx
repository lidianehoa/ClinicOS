import { useState } from 'react';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { APP_ID, SupplyUsed, Product, stockAlertsCol, consultationsCol } from '../../services/dataService';
import { AlertTriangle, Check, Loader2, Package, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  consultationId: string;
  supplies: SupplyUsed[];
  onConfirm: () => void;
  onCancel: () => void;
}

const FinalizeConsultationModal = ({ consultationId, supplies, onConfirm, onCancel }: Props) => {
  const { t } = useTranslation(['medical', 'common']);
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<Record<string, { current: number, min: number }>>({});
  const [fetching, setFetching] = useState(true);

  useState(() => {
    const fetchStocks = async () => {
      try {
        const stockMap: Record<string, { current: number, min: number }> = {};
        for (const sup of supplies) {
          const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'products', sup.productId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data() as Product;
            stockMap[sup.productId] = {
              current: data.currentStock || 0,
              min: data.minStock || 0
            };
          } else {
            stockMap[sup.productId] = { current: 0, min: 0 };
          }
        }
        setStocks(stockMap);
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    };
    if (supplies.length > 0) {
      fetchStocks();
    } else {
      setFetching(false);
    }
  });

  const handleFinalize = async () => {
    setLoading(true);
    try {
      const batch = writeBatch(db);

      // 1. Marcar consulta como concluída
      const cRef = doc(consultationsCol(APP_ID), consultationId);
      batch.update(cRef, {
        status: 'completed',
        updatedAt: new Date().toISOString()
      });

      // 2. Dar baixa no estoque e gerar alertas
      for (const sup of supplies) {
        const pRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'products', sup.productId);
        const stockData = stocks[sup.productId];
        if (!stockData) continue;
        
        const newStock = stockData.current - sup.quantity;
        
        batch.update(pRef, {
          currentStock: newStock,
          updatedAt: new Date().toISOString()
        });

        // 3. Alert se abaixo do mínimo
        if (newStock < stockData.min) {
          const alertRef = doc(stockAlertsCol(APP_ID));
          batch.set(alertRef, {
            id: alertRef.id,
            productId: sup.productId,
            productName: sup.productName,
            currentStock: newStock,
            minStock: stockData.min,
            alertType: newStock <= 0 ? 'out_of_stock' : 'below_minimum',
            resolvedAt: null,
            createdAt: new Date().toISOString()
          });
        }
      }

      await batch.commit();
      onConfirm();
    } catch (err) {
      console.error(err);
      alert('Erro ao finalizar consulta e baixar estoque.');
      setLoading(false);
    }
  };

  const hasAlerts = supplies.some(sup => {
    const s = stocks[sup.productId];
    return s && (s.current - sup.quantity) < s.min;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
        
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{t('medical:consultation.finalize_title', 'Finalizar Consulta')}</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-slate-300">
            {t('medical:consultation.finalize_desc', 'A consulta será encerrada e o prontuário fechado. Os seguintes insumos serão baixados do estoque:')}
          </p>

          {fetching ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-teal-500" /></div>
          ) : supplies.length === 0 ? (
            <div className="bg-slate-900/50 rounded-xl p-6 text-center border border-white/5">
              <Package className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-slate-400 font-medium">{t('medical:consultation.no_supplies', 'Nenhum insumo foi utilizado nesta consulta.')}</p>
            </div>
          ) : (
            <div className="bg-slate-900/50 rounded-xl border border-white/5 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-slate-400 bg-slate-900/80">
                    <th className="p-3 font-medium">{t('medical:inventory.product', 'Produto')}</th>
                    <th className="p-3 font-medium">{t('medical:inventory.qty_used', 'Qtd Usada')}</th>
                    <th className="p-3 font-medium">{t('medical:inventory.current_stock', 'Estoque Atual')}</th>
                    <th className="p-3 font-medium text-right">{t('medical:inventory.after_deduction', 'Após Baixa')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {supplies.map(sup => {
                    const s = stocks[sup.productId];
                    const current = s?.current || 0;
                    const min = s?.min || 0;
                    const after = current - sup.quantity;
                    const isAlert = after < min;

                    return (
                      <tr key={sup.productId}>
                        <td className="p-3 font-medium text-white">{sup.productName}</td>
                        <td className="p-3">{sup.quantity} {sup.unit}</td>
                        <td className="p-3">{current}</td>
                        <td className={`p-3 text-right font-bold ${isAlert ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {after}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {hasAlerts && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-amber-500 font-bold text-sm">{t('medical:inventory.stock_alert_title', 'Atenção ao estoque')}</h4>
                <p className="text-amber-500/80 text-sm mt-0.5">{t('medical:inventory.stock_alert_desc', 'Alguns produtos ficarão abaixo do estoque mínimo. O sistema gerará um alerta para a equipe administrativa.')}</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/5 flex items-center justify-end gap-3 bg-slate-900/50">
          <button 
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl font-bold text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            {t('common:cancel', 'Cancelar')}
          </button>
          <button 
            onClick={handleFinalize}
            disabled={loading || fetching}
            className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-teal-500/20 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            {t('medical:consultation.confirm_and_deduct', 'Confirmar e Baixar Estoque')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinalizeConsultationModal;
