import { useState } from 'react';
import { PricingConfig, savePricingConfig, StaffCost, FixedExpense } from '../../services/pricingService';
import { Users, Building, Percent, Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  config: PricingConfig;
}

const PricingSetupTab = ({ config }: Props) => {
  const { t } = useTranslation(['pricing', 'common']);
  const [localConfig, setLocalConfig] = useState<PricingConfig>(config);
  const [saving, setSaving] = useState(false);

  // Validação do mix
  const totalMix = localConfig.paymentMix.debit + 
                   localConfig.paymentMix.creditCash + 
                   localConfig.paymentMix.creditInstallment + 
                   localConfig.paymentMix.pix;
  const mixValid = Math.abs(totalMix - 100) < 0.1;

  const handleSave = async () => {
    if (!mixValid) return;
    setSaving(true);
    try {
      await savePricingConfig(localConfig);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const addStaff = () => {
    const newStaff: StaffCost = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      role: '',
      monthlyCost: 0,
      hoursPerMonth: 176,
      type: 'clinical'
    };
    setLocalConfig({ ...localConfig, staff: [...localConfig.staff, newStaff] });
  };

  const updateStaff = (id: string, updates: Partial<StaffCost>) => {
    setLocalConfig({
      ...localConfig,
      staff: localConfig.staff.map(s => s.id === id ? { ...s, ...updates } : s)
    });
  };

  const removeStaff = (id: string) => {
    setLocalConfig({
      ...localConfig,
      staff: localConfig.staff.filter(s => s.id !== id)
    });
  };

  const addExpense = () => {
    const newExp: FixedExpense = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      amount: 0,
      category: 'facility'
    };
    setLocalConfig({ ...localConfig, fixedExpenses: [...localConfig.fixedExpenses, newExp] });
  };

  const updateExpense = (id: string, updates: Partial<FixedExpense>) => {
    setLocalConfig({
      ...localConfig,
      fixedExpenses: localConfig.fixedExpenses.map(e => e.id === id ? { ...e, ...updates } : e)
    });
  };

  const removeExpense = (id: string) => {
    setLocalConfig({
      ...localConfig,
      fixedExpenses: localConfig.fixedExpenses.filter(e => e.id !== id)
    });
  };

  const totalMonthlyLabor = localConfig.staff.reduce((acc, s) => acc + s.monthlyCost, 0);
  const totalFixedExpenses = localConfig.fixedExpenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="space-y-6">
      
      {/* 1. Team & Labor */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 rounded-2xl text-primary">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{t('pricing:setup.team_title', 'Equipe e Custo de Mão de Obra')}</h2>
              <p className="text-purple-200/60 text-sm">{t('pricing:setup.team_subtitle', 'Custo mensal de todos os colaboradores e sócios')}</p>
            </div>
          </div>
          <button onClick={addStaff} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> {t('common:add', 'Adicionar')}
          </button>
        </div>

        <div className="space-y-4">
          {localConfig.staff.map(member => (
            <div key={member.id} className="grid grid-cols-12 gap-4 items-center bg-base/50 p-4 rounded-2xl border border-white/5">
              <div className="col-span-3">
                <label className="text-xs text-white/50 mb-1 block">Nome</label>
                <input type="text" value={member.name} onChange={e => updateStaff(member.id, { name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50" placeholder="Nome" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-white/50 mb-1 block">Cargo</label>
                <input type="text" value={member.role} onChange={e => updateStaff(member.id, { role: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50" placeholder="Ex: Vet" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-white/50 mb-1 block">Tipo</label>
                <select value={member.type} onChange={e => updateStaff(member.id, { type: e.target.value as any })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50">
                  <option className="bg-base" value="clinical">Clínico</option>
                  <option className="bg-base" value="fixed">Fixo (Admin)</option>
                  <option className="bg-base" value="prolabore">Pró-labore</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-white/50 mb-1 block">Custo Mês (R$)</label>
                <input type="number" value={member.monthlyCost} onChange={e => updateStaff(member.id, { monthlyCost: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50" />
              </div>
              <div className="col-span-1">
                <label className="text-xs text-white/50 mb-1 block">Horas/Mês</label>
                <input type="number" value={member.hoursPerMonth} onChange={e => updateStaff(member.id, { hoursPerMonth: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50" />
              </div>
              <div className="col-span-1">
                <label className="text-xs text-white/50 mb-1 block">Custo/h</label>
                <div className="py-2 text-sm text-primary font-bold">
                  R$ {member.hoursPerMonth ? (member.monthlyCost / member.hoursPerMonth).toFixed(2) : '0.00'}
                </div>
              </div>
              <div className="col-span-1 flex justify-end">
                <button onClick={() => removeStaff(member.id)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors mt-5">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {localConfig.staff.length === 0 && (
             <div className="text-center py-6 text-white/40 text-sm border border-dashed border-white/10 rounded-2xl">
               Nenhum colaborador adicionado.
             </div>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-white/10 text-right">
          <span className="text-white/60 text-sm">Custo Total de Pessoal: </span>
          <span className="text-xl font-bold text-white ml-2">R$ {totalMonthlyLabor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / mês</span>
        </div>
      </div>

      {/* 2. Fixed Expenses */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-secondary/20 rounded-2xl text-secondary">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{t('pricing:setup.expenses_title', 'Despesas Fixas')}</h2>
              <p className="text-purple-200/60 text-sm">{t('pricing:setup.expenses_subtitle', 'Aluguel, luz, software, marketing e outros custos fixos')}</p>
            </div>
          </div>
          <button onClick={addExpense} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> {t('common:add', 'Adicionar')}
          </button>
        </div>

        <div className="space-y-4">
          {localConfig.fixedExpenses.map(expense => (
            <div key={expense.id} className="grid grid-cols-12 gap-4 items-center bg-base/50 p-4 rounded-2xl border border-white/5">
              <div className="col-span-4">
                <label className="text-xs text-white/50 mb-1 block">Descrição</label>
                <input type="text" value={expense.name} onChange={e => updateExpense(expense.id, { name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50" placeholder="Ex: Aluguel" />
              </div>
              <div className="col-span-4">
                <label className="text-xs text-white/50 mb-1 block">Categoria</label>
                <select value={expense.category} onChange={e => updateExpense(expense.id, { category: e.target.value as any })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50">
                  <option className="bg-base" value="facility">Instalações</option>
                  <option className="bg-base" value="utilities">Utilidades</option>
                  <option className="bg-base" value="software">Software/Sistemas</option>
                  <option className="bg-base" value="marketing">Marketing</option>
                  <option className="bg-base" value="other">Outros</option>
                </select>
              </div>
              <div className="col-span-3">
                <label className="text-xs text-white/50 mb-1 block">Valor Mensal (R$)</label>
                <input type="number" value={expense.amount} onChange={e => updateExpense(expense.id, { amount: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50" />
              </div>
              <div className="col-span-1 flex justify-end">
                <button onClick={() => removeExpense(expense.id)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors mt-5">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
           {localConfig.fixedExpenses.length === 0 && (
             <div className="text-center py-6 text-white/40 text-sm border border-dashed border-white/10 rounded-2xl">
               Nenhuma despesa adicionada.
             </div>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-white/10 text-right">
          <span className="text-white/60 text-sm">Total de Despesas Fixas: </span>
          <span className="text-xl font-bold text-white ml-2">R$ {totalFixedExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / mês</span>
        </div>
      </div>

      {/* 3. Taxes, Rates & Volume */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-400">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{t('pricing:setup.taxes_title', 'Impostos, Taxas e Volume')}</h2>
            <p className="text-purple-200/60 text-sm">{t('pricing:setup.taxes_subtitle', 'Taxas que incidem sobre o preço de venda e projeção de ocupação')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-2 border-b border-white/10 pb-2">Gerais</h3>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Imposto Simples/ISS (%)</label>
              <input type="number" step="0.1" value={localConfig.taxRate} onChange={e => setLocalConfig({...localConfig, taxRate: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Dias Úteis / Mês</label>
              <input type="number" value={localConfig.monthlyWorkingDays} onChange={e => setLocalConfig({...localConfig, monthlyWorkingDays: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Horas Clínicas / Dia</label>
              <input type="number" value={localConfig.dailyWorkingHours} onChange={e => setLocalConfig({...localConfig, dailyWorkingHours: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-2 border-b border-white/10 pb-2">Taxas Maquininha (%)</h3>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Débito</label>
              <input type="number" step="0.1" value={localConfig.cardRates.debit} onChange={e => setLocalConfig({...localConfig, cardRates: {...localConfig.cardRates, debit: Number(e.target.value)}})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Crédito à Vista</label>
              <input type="number" step="0.1" value={localConfig.cardRates.creditCash} onChange={e => setLocalConfig({...localConfig, cardRates: {...localConfig.cardRates, creditCash: Number(e.target.value)}})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Crédito Parcelado</label>
              <input type="number" step="0.1" value={localConfig.cardRates.creditInstallment} onChange={e => setLocalConfig({...localConfig, cardRates: {...localConfig.cardRates, creditInstallment: Number(e.target.value)}})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Pix/Dinheiro</label>
              <input type="number" step="0.1" value={localConfig.cardRates.pix} onChange={e => setLocalConfig({...localConfig, cardRates: {...localConfig.cardRates, pix: Number(e.target.value)}})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50" />
            </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-2 border-b border-white/10 pb-2">Payment Mix (% Faturamento)</h3>
             <div>
              <label className="text-xs text-white/50 mb-1 block">Débito</label>
              <input type="number" value={localConfig.paymentMix.debit} onChange={e => setLocalConfig({...localConfig, paymentMix: {...localConfig.paymentMix, debit: Number(e.target.value)}})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Crédito à Vista</label>
              <input type="number" value={localConfig.paymentMix.creditCash} onChange={e => setLocalConfig({...localConfig, paymentMix: {...localConfig.paymentMix, creditCash: Number(e.target.value)}})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Crédito Parcelado</label>
              <input type="number" value={localConfig.paymentMix.creditInstallment} onChange={e => setLocalConfig({...localConfig, paymentMix: {...localConfig.paymentMix, creditInstallment: Number(e.target.value)}})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Pix/Dinheiro</label>
              <input type="number" value={localConfig.paymentMix.pix} onChange={e => setLocalConfig({...localConfig, paymentMix: {...localConfig.paymentMix, pix: Number(e.target.value)}})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50" />
            </div>
            
            <div className={`p-3 rounded-xl border flex items-start gap-2 ${mixValid ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold">Total do Mix: {totalMix}%</p>
                {!mixValid && <p className="text-xs opacity-80">A soma deve ser exatamente 100%.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={!mixValid || saving}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-3 px-8 rounded-2xl shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {t('common:save_settings', 'Salvar Configurações')}
        </button>
      </div>

    </div>
  );
};

export default PricingSetupTab;
