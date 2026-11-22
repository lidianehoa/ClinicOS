import { useState } from 'react';
import { X, Save, Percent, DollarSign, Settings } from 'lucide-react';
import { PricingConfig, savePricingConfig } from '../../services/pricingService';

interface PricingConfigModalProps {
  config: PricingConfig;
  onClose: () => void;
  onSaved: () => void;
}

export default function PricingConfigModal({ config, onClose, onSaved }: PricingConfigModalProps) {
  const [taxRate, setTaxRate] = useState(config.taxRate || 6);
  const [cardRates, setCardRates] = useState(config.cardRates || { debit: 1.5, creditCash: 2.5, creditInstallment: 3.5, pix: 0 });
  const [monthlyWorkingDays, setMonthlyWorkingDays] = useState(config.monthlyWorkingDays || 22);
  const [dailyWorkingHours, setDailyWorkingHours] = useState(config.dailyWorkingHours || 8);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await savePricingConfig({
        ...config,
        taxRate: Number(taxRate) || 0,
        cardRates,
        monthlyWorkingDays: Number(monthlyWorkingDays) || 22,
        dailyWorkingHours: Number(dailyWorkingHours) || 8,
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar as configurações de precificação.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1E1B4B] border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 text-purple-300 rounded-xl flex items-center justify-center border border-purple-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Parâmetros Globais de Precificação</h2>
              <p className="text-xs text-purple-200/70">Ajuste as alíquotas fiscais e taxas padrão para cálculo de margem</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/50 hover:bg-white/10 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Impostos & Horas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-amber-400" />
                Imposto Médio (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={taxRate}
                onChange={e => setTaxRate(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
                Dias Úteis / Mês
              </label>
              <input
                type="number"
                value={monthlyWorkingDays}
                onChange={e => setMonthlyWorkingDays(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
                Horas / Dia
              </label>
              <input
                type="number"
                value={dailyWorkingHours}
                onChange={e => setDailyWorkingHours(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          {/* Taxas de Meio de Pagamento */}
          <div>
            <h3 className="text-sm font-bold text-white/90 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Taxas Médias de Cartão / PIX (%)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <label className="text-xs text-white/60 block mb-1">PIX</label>
                <input
                  type="number"
                  step="0.01"
                  value={cardRates.pix}
                  onChange={e => setCardRates({ ...cardRates, pix: Number(e.target.value) })}
                  className="w-full bg-transparent font-bold text-white text-sm outline-none"
                />
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <label className="text-xs text-white/60 block mb-1">Débito</label>
                <input
                  type="number"
                  step="0.01"
                  value={cardRates.debit}
                  onChange={e => setCardRates({ ...cardRates, debit: Number(e.target.value) })}
                  className="w-full bg-transparent font-bold text-white text-sm outline-none"
                />
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <label className="text-xs text-white/60 block mb-1">Crédito À Vista</label>
                <input
                  type="number"
                  step="0.01"
                  value={cardRates.creditCash}
                  onChange={e => setCardRates({ ...cardRates, creditCash: Number(e.target.value) })}
                  className="w-full bg-transparent font-bold text-white text-sm outline-none"
                />
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <label className="text-xs text-white/60 block mb-1">Crédito Parcelado</label>
                <input
                  type="number"
                  step="0.01"
                  value={cardRates.creditInstallment}
                  onChange={e => setCardRates({ ...cardRates, creditInstallment: Number(e.target.value) })}
                  className="w-full bg-transparent font-bold text-white text-sm outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-lg transition-all"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Parâmetros'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
