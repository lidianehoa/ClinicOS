import { useState, useEffect } from 'react';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { AppUser, APP_ID, ScheduledDose, Product, scheduledDosesCol, stockAlertsCol } from '../../services/dataService';
import { Loader2, X, Check, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  dose: ScheduledDose;
  userProfile: AppUser | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const AdministerDoseModal = ({ dose, userProfile, onCancel, onSuccess }: Props) => {
  const { t } = useTranslation(['medical', 'common']);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [stock, setStock] = useState<{ current: number, min: number, name: string } | null>(null);

  const [quantity, setQuantity] = useState('1');

  useEffect(() => {
    const fetchStock = async () => {
      if (!dose.productId) {
        setFetching(false);
        return;
      }
      try {
        const pRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'products', dose.productId);
        const snap = await getDoc(pRef);
        if (snap.exists()) {
          const data = snap.data() as Product;
          setStock({
            current: data.currentStock || 0,
            min: data.minStock || 0,
            name: data.name
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    };
    fetchStock();
  }, [dose]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const nowStr = new Date().toISOString();

      // 1. Atualizar a Dose
      const dRef = doc(scheduledDosesCol(APP_ID), dose.id);
      batch.update(dRef, {
        status: 'administered',
        administeredAt: nowStr,
        administeredBy: userProfile?.nome,
        administeredById: userProfile?.uid,
        stockDeducted: !!dose.productId,
        quantity: Number(quantity),
        updatedAt: nowStr
      });

      // 2. Dar baixa no estoque
      if (dose.productId && stock) {
        const pRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'products', dose.productId);
        const newStock = stock.current - Number(quantity);
        
        batch.update(pRef, {
          currentStock: newStock,
          updatedAt: nowStr
        });

        // 3. Alerta de estoque
        if (newStock < stock.min) {
          const alertRef = doc(stockAlertsCol(APP_ID));
          batch.set(alertRef, {
            id: alertRef.id,
            productId: dose.productId,
            productName: stock.name,
            currentStock: newStock,
            minStock: stock.min,
            alertType: newStock <= 0 ? 'out_of_stock' : 'below_minimum',
            resolvedAt: null,
            createdAt: nowStr
          });
        }
      }

      await batch.commit();
      onSuccess();
    } catch (err) {
      console.error(err);
      alert(t('medical:hospitalization.error_administer', 'Erro ao confirmar administração.'));
    } finally {
      setLoading(false);
    }
  };

  const willAlert = stock && (stock.current - Number(quantity) < stock.min);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
        
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{t('medical:hospitalization.administer_dose', 'Administrar Dose')}</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4">
            <h3 className="text-teal-400 font-bold text-lg">{dose.productName}</h3>
            <p className="text-slate-300 text-sm mt-1">{t('medical:hospitalization.dosage', 'Dosagem:')} {dose.dosage}</p>
            <p className="text-slate-300 text-sm">{t('medical:hospitalization.route', 'Via:')} {dose.route}</p>
            <p className="text-slate-400 text-xs mt-2">{t('medical:hospitalization.scheduled_time', 'Horário programado:')} {dose.scheduledDate.split('-').reverse().join('/')} às {dose.scheduledTime}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-400">{t('medical:hospitalization.qty_deducted', 'Quantidade utilizada (para baixa no estoque)')}</label>
            <input type="number" step="0.1" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500 text-lg font-bold text-center" />
          </div>

          {fetching ? (
            <div className="flex justify-center"><Loader2 className="w-5 h-5 text-teal-500 animate-spin" /></div>
          ) : stock ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">{t('medical:inventory.current_stock', 'Estoque Atual')}: {stock.current}</span>
              <span className={`font-bold ${willAlert ? 'text-amber-400' : 'text-emerald-400'}`}>
                {t('medical:inventory.after_deduction', 'Após Baixa')}: {stock.current - Number(quantity)}
              </span>
            </div>
          ) : null}

          {willAlert && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-amber-500/80 text-xs">{t('medical:inventory.stock_alert_desc', 'Alguns produtos ficarão abaixo do estoque mínimo. O sistema gerará um alerta para a equipe administrativa.')}</p>
            </div>
          )}

          <div className="text-center text-xs text-slate-500 pt-2 border-t border-white/5">
            {t('medical:hospitalization.responsible_prof', 'Profissional responsável:')} Dr(a). {userProfile?.nome}
          </div>
        </div>

        <div className="p-6 border-t border-white/5 flex gap-3 bg-slate-900/50">
          <button onClick={onCancel} disabled={loading} className="flex-1 py-3 rounded-xl font-bold text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            {t('common:cancel', 'Cancelar')}
          </button>
          <button onClick={handleConfirm} disabled={loading || fetching} className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />} {t('common:confirm', 'Confirmar')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdministerDoseModal;
