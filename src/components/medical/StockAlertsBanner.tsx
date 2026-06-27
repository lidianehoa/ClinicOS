import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { APP_ID, type StockAlert } from '../../services/dataService';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const StockAlertsBanner = () => {
  const { t } = useTranslation(['medical', 'common']);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!db) return;
    const q = query(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'stock_alerts'),
      where('resolvedAt', '==', null)
    );

    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as StockAlert));
      // order locally by createdAt desc
      list.sort((a, b) => {
        const da = a.createdAt?.seconds || 0;
        const dbTime = b.createdAt?.seconds || 0;
        return dbTime - da;
      });
      setAlerts(list);
    }, err => {
      console.error('Error fetching stock alerts:', err);
    });

    return () => unsub();
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-sm font-bold text-amber-500">
            {alerts.length} {alerts.length === 1 ? t('medical:inventory.product_below_min', 'produto está com estoque abaixo do mínimo') : t('medical:inventory.products_below_min', 'produtos estão com estoque abaixo do mínimo')}
          </p>
        </div>
        <button className="text-amber-500/50 hover:text-amber-500 transition-colors p-1">
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pl-11 pr-4 pb-2 space-y-2 animate-in fade-in slide-in-from-top-2">
          {alerts.map(alert => (
            <div key={alert.id} className="text-sm text-amber-500/80 bg-black/20 px-3 py-2 rounded-lg flex items-center justify-between">
              <span><strong>{alert.productName}</strong></span>
              <span className="font-mono text-xs">{t('medical:inventory.current', 'Atual')}: {alert.currentStock} / {t('medical:inventory.min', 'Mín')}: {alert.minStock}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StockAlertsBanner;
