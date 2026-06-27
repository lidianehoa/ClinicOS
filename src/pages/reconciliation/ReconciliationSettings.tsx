import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { getReconciliationConfig, saveReconciliationConfig, ReconciliationConfig, DEFAULT_RATES } from '../../services/reconciliationService';
import { useTranslation } from 'react-i18next';

interface Props {
  onClose: () => void;
}

const ReconciliationSettings = ({ onClose }: Props) => {
  const { t } = useTranslation(['admin', 'common']);
  const [config, setConfig] = useState<ReconciliationConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getReconciliationConfig().then(setConfig);
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    await saveReconciliationConfig(config);
    setSaving(false);
    onClose();
  };

  if (!config) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1E1B4B] w-full max-w-lg rounded-[2rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col">
        
        <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div>
            <h2 className="text-xl font-bold text-white">{t('admin:reconciliation.settings_title', 'Configurações de Conciliação')}</h2>
            <p className="text-sm text-purple-200/60">{t('admin:reconciliation.settings_subtitle', 'Ajuste de tolerâncias e taxas bancárias')}</p>
          </div>
          <button onClick={onClose} className="p-2 text-white/50 hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-amber-400 text-sm">
            <strong>Nota:</strong> Estas taxas podem refletir a configuração do módulo de Precificação (Pricing).
            Alterações feitas aqui serão salvas localmente para as regras de conciliação.
          </div>

          <div>
            <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-4 border-b border-white/10 pb-2">Tolerâncias de Casamento (Auto-Match)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/60 mb-1.5 block">Tolerância de Data (dias)</label>
                <input 
                  type="number" 
                  value={config.dateTolerance}
                  onChange={e => setConfig({ ...config, dateTolerance: Number(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1.5 block">Tolerância de Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={config.amountTolerance}
                  onChange={e => setConfig({ ...config, amountTolerance: Number(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-4 border-b border-white/10 pb-2">Taxas de Maquininha (%)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/60 mb-1.5 block">Débito</label>
                <input 
                  type="number" step="0.1"
                  value={config.cardRates.debit}
                  onChange={e => setConfig({ ...config, cardRates: { ...config.cardRates, debit: Number(e.target.value) } })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1.5 block">Crédito à Vista</label>
                <input 
                  type="number" step="0.1"
                  value={config.cardRates.creditCash}
                  onChange={e => setConfig({ ...config, cardRates: { ...config.cardRates, creditCash: Number(e.target.value) } })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1.5 block">Crédito Parcelado</label>
                <input 
                  type="number" step="0.1"
                  value={config.cardRates.creditInstallment}
                  onChange={e => setConfig({ ...config, cardRates: { ...config.cardRates, creditInstallment: Number(e.target.value) } })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1.5 block">Pix/Transferência</label>
                <input 
                  type="number" step="0.1"
                  value={config.cardRates.pix}
                  onChange={e => setConfig({ ...config, cardRates: { ...config.cardRates, pix: Number(e.target.value) } })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-4 border-b border-white/10 pb-2">Adiantamento de Recebíveis</h3>
            <div>
              <label className="text-xs text-white/60 mb-1.5 block">Taxa de Adiantamento (% ao mês)</label>
              <input 
                type="number" step="0.1"
                value={config.anticipationRate}
                onChange={e => setConfig({ ...config, anticipationRate: Number(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

        </div>

        <div className="px-6 py-4 border-t border-white/10 bg-black/40 flex justify-between items-center">
          <button 
            onClick={() => setConfig(DEFAULT_RATES)}
            className="text-sm text-white/50 hover:text-white transition-colors"
          >
            Restaurar Padrões
          </button>
          
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-medium text-white/70 hover:bg-white/10 transition-colors">
              Cancelar
            </button>
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : <Save className="w-5 h-5" />}
              Salvar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ReconciliationSettings;
