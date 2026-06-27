import { useEffect, useState } from 'react';
import { PricingConfig, subscribeServicePricingList, ServicePricingInput, PricingResult } from '../../services/pricingService';
import { LineChart, DollarSign, Activity, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  config: PricingConfig;
}

type PricingData = ServicePricingInput & { result: PricingResult };

const PricingDashboardTab = ({ config }: Props) => {
  const { t } = useTranslation(['pricing', 'common']);
  const [pricings, setPricings] = useState<PricingData[]>([]);

  useEffect(() => {
    const unsub = subscribeServicePricingList(setPricings);
    return () => unsub();
  }, []);

  const totalFixedCost = config.fixedExpenses.reduce((acc, e) => acc + e.amount, 0) + 
                         config.staff.filter(s => s.type === 'fixed').reduce((acc, s) => acc + s.monthlyCost, 0);

  // KPIs
  const healthyCount = pricings.filter(p => p.result.contributionMargin >= p.targetMargin).length;
  const lossCount = pricings.filter(p => p.result.contributionMargin <= 0).length;
  
  const avgMargin = pricings.length > 0 
    ? pricings.reduce((acc, p) => acc + p.result.contributionMargin, 0) / pricings.length 
    : 0;

  // Sorted arrays for Top/Bottom
  const sortedByMargin = [...pricings].sort((a, b) => b.result.contributionMargin - a.result.contributionMargin);
  const top3 = sortedByMargin.slice(0, 3);
  const bottom3 = [...sortedByMargin].reverse().slice(0, 3);

  // Costs composition (overall portfolio averages)
  const totalLabor = pricings.reduce((acc, p) => acc + p.result.laborCost, 0);
  const totalSupplies = pricings.reduce((acc, p) => acc + p.result.suppliesCost, 0);
  const totalFixed = pricings.reduce((acc, p) => acc + p.result.fixedCostShare, 0);
  const grandTotalCost = totalLabor + totalSupplies + totalFixed;

  const laborPct = grandTotalCost ? (totalLabor / grandTotalCost) * 100 : 0;
  const suppliesPct = grandTotalCost ? (totalSupplies / grandTotalCost) * 100 : 0;
  const fixedPct = grandTotalCost ? (totalFixed / grandTotalCost) * 100 : 0;

  return (
    <div className="space-y-6">
      
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col justify-between">
          <div className="flex items-center gap-2 text-purple-300 mb-2">
            <DollarSign className="w-5 h-5" />
            <span className="text-sm font-medium">{t('pricing:dashboard.total_fixed_cost', 'Custo Fixo Total')}</span>
          </div>
          <div className="text-2xl font-bold text-white">R$ {totalFixedCost.toLocaleString('pt-BR')}</div>
          <p className="text-xs text-white/40 mt-1">por mês</p>
        </div>

        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col justify-between">
          <div className="flex items-center gap-2 text-purple-300 mb-2">
            <LineChart className="w-5 h-5" />
            <span className="text-sm font-medium">{t('pricing:dashboard.avg_margin', 'Margem Média')}</span>
          </div>
          <div className="text-2xl font-bold text-white">{avgMargin.toFixed(1)}%</div>
          <p className="text-xs text-white/40 mt-1">de contribuição</p>
        </div>

        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col justify-between">
          <div className="flex items-center gap-2 text-purple-300 mb-2">
            <Activity className="w-5 h-5" />
            <span className="text-sm font-medium">{t('pricing:dashboard.portfolio_health', 'Saúde do Portfólio')}</span>
          </div>
          <div className="text-2xl font-bold text-white">{pricings.length > 0 ? ((healthyCount / pricings.length) * 100).toFixed(0) : 0}%</div>
          <p className="text-xs text-white/40 mt-1">serviços no alvo</p>
        </div>

        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col justify-between">
          <div className="flex items-center gap-2 text-purple-300 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-medium">{t('pricing:dashboard.in_loss', 'Em Prejuízo')}</span>
          </div>
          <div className={`text-2xl font-bold ${lossCount > 0 ? 'text-red-400' : 'text-white'}`}>{lossCount}</div>
          <p className="text-xs text-white/40 mt-1">serviços</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top/Bottom margins */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <h2 className="text-lg font-bold text-white mb-6">Ranking de Margens</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-green-400 mb-3 uppercase tracking-wider">Top 3 Maiores Margens</h3>
              {top3.length > 0 ? top3.map((p, i) => (
                <div key={p.serviceId} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-white/40 font-bold">{i + 1}.</span>
                    <span className="text-white text-sm">{p.serviceName}</span>
                  </div>
                  <div className="text-green-400 font-bold text-sm">
                    {p.result.contributionMargin.toFixed(1)}%
                  </div>
                </div>
              )) : <p className="text-sm text-white/40">Nenhum serviço precificado.</p>}
            </div>

            <div>
              <h3 className="text-sm font-bold text-red-400 mb-3 uppercase tracking-wider">Top 3 Piores Margens</h3>
              {bottom3.length > 0 ? bottom3.map((p, i) => (
                <div key={p.serviceId} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-white/40 font-bold">{i + 1}.</span>
                    <span className="text-white text-sm">{p.serviceName}</span>
                  </div>
                  <div className={`font-bold text-sm ${p.result.contributionMargin < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                    {p.result.contributionMargin.toFixed(1)}%
                  </div>
                </div>
              )) : <p className="text-sm text-white/40">Nenhum serviço precificado.</p>}
            </div>
          </div>
        </div>

        {/* Cost Composition & Breakdown */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col">
          <h2 className="text-lg font-bold text-white mb-6">Composição de Custos Base</h2>
          
          {grandTotalCost > 0 ? (
            <div className="flex-1 flex flex-col justify-center">
              {/* Stacked bar */}
              <div className="h-8 rounded-full overflow-hidden flex mb-6">
                <div style={{ width: `${laborPct}%` }} className="h-full bg-teal-500" title={`Mão de Obra: ${laborPct.toFixed(1)}%`} />
                <div style={{ width: `${suppliesPct}%` }} className="h-full bg-emerald-500" title={`Insumos: ${suppliesPct.toFixed(1)}%`} />
                <div style={{ width: `${fixedPct}%` }} className="h-full bg-purple-500" title={`Custo Fixo: ${fixedPct.toFixed(1)}%`} />
              </div>

              {/* Legend */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-teal-500" />
                    <span className="text-sm text-white">Mão de Obra Clínica</span>
                  </div>
                  <span className="text-sm font-bold text-white">{laborPct.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-sm text-white">Insumos/Materiais</span>
                  </div>
                  <span className="text-sm font-bold text-white">{suppliesPct.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span className="text-sm text-white">Rateio de Custos Fixos</span>
                  </div>
                  <span className="text-sm font-bold text-white">{fixedPct.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/40 text-sm">
              Preencha os serviços para ver o gráfico.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default PricingDashboardTab;
