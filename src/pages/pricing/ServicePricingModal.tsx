import { useState, useMemo } from 'react';
import { PricingConfig, ServicePricingInput, calculateServicePrice, SupplyItem } from '../../services/pricingService';
import { ClinicService } from '../../services/dataService';
import { X, Plus, Trash2, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  service: ClinicService;
  config: PricingConfig;
  initialData?: ServicePricingInput;
  onSave: (pricing: ServicePricingInput) => void;
  onClose: () => void;
}

const ServicePricingModal = ({ service, config, initialData, onSave, onClose }: Props) => {
  const { t } = useTranslation(['pricing', 'common']);
  const defaultDuration = service.durationUnit === 'h' ? service.duration * 60 : service.duration;

  const [input, setInput] = useState<ServicePricingInput>({
    serviceId: service.id,
    serviceName: service.name,
    durationMinutes: initialData?.durationMinutes || defaultDuration || 30,
    supplies: initialData?.supplies || [],
    clinicalStaffId: initialData?.clinicalStaffId || (config.staff.find(s => s.type === 'clinical')?.id || ''),
    biologicalRisk: initialData?.biologicalRisk || 'low',
    targetMargin: initialData?.targetMargin || 30,
  });

  // Supply Temp State
  const [newSupply, setNewSupply] = useState<SupplyItem>({ name: '', unitCost: 0, quantity: 1, unit: 'un' });

  // Calculate live results
  const result = useMemo(() => calculateServicePrice(input, config), [input, config]);

  const addSupply = () => {
    if (!newSupply.name || newSupply.unitCost <= 0) return;
    setInput({ ...input, supplies: [...input.supplies, { ...newSupply }] });
    setNewSupply({ name: '', unitCost: 0, quantity: 1, unit: 'un' });
  };

  const removeSupply = (index: number) => {
    const next = [...input.supplies];
    next.splice(index, 1);
    setInput({ ...input, supplies: next });
  };

  const isHealthy = service.price >= result.suggestedPrice;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1E1B4B] w-full max-w-3xl rounded-[2rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div>
            <h2 className="text-xl font-bold text-white">{service.name}</h2>
            <p className="text-sm text-purple-200/60">{t('pricing:modal.config_duration', 'Configuração de Precificação (Duração: {{duration}} min)', { duration: input.durationMinutes })}</p>
          </div>
          <button onClick={onClose} className="p-2 text-white/50 hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column - Inputs */}
          <div className="space-y-6">
            
            {/* Supplies */}
            <div>
              <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-3">Insumos e Materiais</h3>
              <div className="space-y-2 mb-3">
                {input.supplies.map((s, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                    <div>
                      <p className="text-sm text-white font-medium">{s.name}</p>
                      <p className="text-xs text-white/50">{s.quantity} {s.unit} × R$ {s.unitCost.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-primary">R$ {(s.quantity * s.unitCost).toFixed(2)}</span>
                      <button onClick={() => removeSupply(i)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Nome" value={newSupply.name} onChange={e => setNewSupply({...newSupply, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                <input type="number" placeholder="Custo/un" value={newSupply.unitCost || ''} onChange={e => setNewSupply({...newSupply, unitCost: Number(e.target.value)})} className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                <input type="number" placeholder="Qtd" value={newSupply.quantity || ''} onChange={e => setNewSupply({...newSupply, quantity: Number(e.target.value)})} className="w-16 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                <button onClick={addSupply} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"><Plus className="w-5 h-5" /></button>
              </div>
            </div>

            {/* Labor */}
            <div>
              <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-3">Mão de Obra Clínica</h3>
              <select value={input.clinicalStaffId} onChange={e => setInput({...input, clinicalStaffId: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm mb-2">
                <option value="" className="bg-[#1E1B4B]">Selecione quem executa...</option>
                {config.staff.filter(s => s.type === 'clinical' || s.type === 'prolabore').map(s => (
                  <option key={s.id} value={s.id} className="bg-[#1E1B4B]">{s.name} (R$ {s.costPerHour?.toFixed(2)}/h)</option>
                ))}
              </select>
            </div>

            {/* Risk & Margin */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-3">Risco Biológico</h3>
                <select value={input.biologicalRisk} onChange={e => setInput({...input, biologicalRisk: e.target.value as any})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm">
                  <option value="low" className="bg-[#1E1B4B]">Baixo (0%)</option>
                  <option value="medium" className="bg-[#1E1B4B]">Médio (+10%)</option>
                  <option value="high" className="bg-[#1E1B4B]">Alto (+25%)</option>
                  <option value="very_high" className="bg-[#1E1B4B]">Muito Alto (+40%)</option>
                </select>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-3">Margem Alvo (%)</h3>
                <input type="number" value={input.targetMargin} onChange={e => setInput({...input, targetMargin: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm text-center font-bold" />
              </div>
            </div>

          </div>

          {/* Right Column - Results */}
          <div className="bg-black/20 rounded-2xl p-6 border border-white/5">
            <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-4 border-b border-white/10 pb-2">Resultado da Precificação</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Custo de Insumos:</span>
                <span className="text-white font-medium">R$ {result.suppliesCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Custo da Mão de Obra ({input.durationMinutes}m):</span>
                <span className="text-white font-medium">R$ {result.laborCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Rateio Custos Fixos:</span>
                <span className="text-white font-medium">R$ {result.fixedCostShare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-white/10 pt-2">
                <span className="text-white">Custo Total (Subtotal):</span>
                <span className="text-white">R$ {result.subtotalCost.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Deduções Totais:</span>
                <span className="text-white font-medium">{result.totalDeductions.toFixed(1)}% (Imp + Tx)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Preço Mínimo (Break-even):</span>
                <span className="text-white font-medium">R$ {result.minimumPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-primary font-bold">
                <span>Preço Sugerido ({input.targetMargin}% margem):</span>
                <span>R$ {result.suggestedPrice.toFixed(2)}</span>
              </div>
              {result.biologicalRiskPremium > 0 && (
                <div className="flex justify-between text-sm text-red-400 font-bold">
                  <span>Com Risco Biológico (+{result.biologicalRiskPremium}%):</span>
                  <span>R$ {result.maximumPrice.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/10 mt-6">
              <p className="text-xs text-white/50 mb-2 uppercase font-bold tracking-wider">Situação Atual</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-white">R$ {service.price.toFixed(2)}</p>
                  <p className={`text-xs ${isHealthy ? 'text-green-400' : 'text-amber-400'}`}>
                    {isHealthy ? 'Margem Saudável' : 'Abaixo da Margem Alvo'}
                  </p>
                </div>
                {isHealthy && <CheckCircle className="w-8 h-8 text-green-400 opacity-50" />}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/10 bg-black/40 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-medium text-white/70 hover:bg-white/10 transition-colors">
            {t('common:cancel', 'Cancelar')}
          </button>
          <button onClick={() => onSave(input)} className="px-6 py-2.5 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all">
            {t('pricing:modal.save_and_update', 'Salvar e Atualizar Serviço')}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ServicePricingModal;
