import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, CreditCard, DollarSign, TrendingDown } from 'lucide-react';
import { subscribeAllDailyFlows, subscribeAllDespesas, toLocalDateString, type Registro, type Despesa, CATEGORIAS_DESPESA } from '../services/dataService';
import { useTranslation } from 'react-i18next';

const Dashboard = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [allRecords, setAllRecords] = useState<Registro[]>([]);
  const [allDespesas, setAllDespesas] = useState<Despesa[]>([]);
  
  const currentMonthStr = toLocalDateString(new Date()).substring(0, 7); // YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  useEffect(() => {
    const unsubFlow = subscribeAllDailyFlows(setAllRecords);
    const unsubExp = subscribeAllDespesas(setAllDespesas);
    return () => { unsubFlow(); unsubExp(); };
  }, []);

  // ── Cálculos Memorizados ──────────────────────────────────────────────────
  const kpis = useMemo(() => {
    // Filtrar pelo mês selecionado
    const monthRecords = allRecords.filter(r => r._date?.startsWith(selectedMonth));
    const monthDespesas = allDespesas.filter(d => d._date?.startsWith(selectedMonth));

    const totalFaturamento = monthRecords.reduce(
      (s, r) => s + parseFloat(String(r.valor || '0').replace(',', '.')), 0
    );
    const totalDespesas = monthDespesas.reduce(
      (s, d) => s + parseFloat(String(d.valor || '0').replace(',', '.')), 0
    );
    const saldoReal = totalFaturamento - totalDespesas;
    const ticketMedio =
      monthRecords.length > 0 ? totalFaturamento / monthRecords.length : 0;

    // Cálculos da SEMANA ATUAL (últimos 7 dias)
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    const weekAgoStr = toLocalDateString(weekAgo);

    const weekRecords = allRecords.filter(r => r._date && r._date >= weekAgoStr);
    const weekDespesas = allDespesas.filter(d => d._date && d._date >= weekAgoStr);

    const faturamentoSemana = weekRecords.reduce((s, r) => s + parseFloat(String(r.valor || '0').replace(',', '.')), 0);
    const despesasSemana = weekDespesas.reduce((s, d) => s + parseFloat(String(d.valor || '0').replace(',', '.')), 0);

    return {
      totalFaturamento, totalDespesas, saldoReal, ticketMedio,
      faturamentoSemana, despesasSemana,
      monthRecords, monthDespesas
    };
  }, [allRecords, allDespesas, selectedMonth]);

  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = toLocalDateString(d);
      const label = d.toLocaleDateString('pt-BR', { weekday: 'short' });

      const dayRecords = allRecords.filter(r => r._date === key);
      const entries = dayRecords.reduce((s, r) => {
        const val = String(r.valor || '0').replace(',', '.');
        return s + parseFloat(val || '0');
      }, 0);

      const dayExps = allDespesas.filter(exp => exp._date === key);
      const expenses = dayExps.reduce((s, exp) => {
        const val = String(exp.valor || '0').replace(',', '.');
        return s + parseFloat(val || '0');
      }, 0);

      return { label, entries, expenses, key };
    });
  }, [allRecords, allDespesas]);

  const maxVal = useMemo(() => 
    Math.max(...last7Days.map(d => Math.max(d.entries, d.expenses)), 1)
  , [last7Days]);

  const fmt = (n: number) =>
    n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // ── Distribuição por forma de pagamento — client-side ─────────────────────

  const paymentMethods = ['Pix', 'Débito', 'Crédito', 'Dinheiro'] as const;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{t('dashboard:title', 'Dashboard Gerencial')}</h1>
          <p className="text-slate-500 mt-1">{t('dashboard:subtitle', 'Analytics e KPIs do período selecionado.')}</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-purple-100 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase ml-2">Filtrar Mês</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="border-none focus:ring-0 text-sm font-semibold text-slate-700 cursor-pointer"
          />
        </div>
      </header>

      {/* ── Destaque da Semana ─────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-[32px] p-6 border border-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
            <TrendingUp className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">{t('dashboard:week_performance', 'Desempenho da Semana')}</h2>
            <p className="text-slate-500 text-sm">{t('dashboard:last_7_days', 'Últimos 7 dias de operação')}</p>
          </div>
        </div>
        
        <div className="flex gap-8">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('dashboard:kpi_revenue', 'Faturamento')} (7d)</p>
            <p className="text-xl font-black text-slate-800">{fmt(kpis.faturamentoSemana)}</p>
          </div>
          <div className="w-px h-10 bg-slate-200 hidden md:block" />
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('dashboard:kpi_expenses', 'Despesas')} (7d)</p>
            <p className="text-xl font-black text-red-500">{fmt(kpis.despesasSemana)}</p>
          </div>
          <div className="w-px h-10 bg-slate-200 hidden md:block" />
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Resultado</p>
            <p className={`text-xl font-black ${kpis.faturamentoSemana - kpis.despesasSemana >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {fmt(kpis.faturamentoSemana - kpis.despesasSemana)}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-purple-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">{t('dashboard:kpi_balance', 'Saldo Real')}</p>
            <p className={`text-2xl font-bold mt-2 ${kpis.saldoReal < 0 ? 'text-red-500' : 'text-slate-800'}`}>
              {fmt(kpis.saldoReal)}
            </p>
            <p className="text-slate-400 text-xs font-medium mt-2">{t('dashboard:balance_subtitle', 'faturamento − despesas')}</p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${kpis.saldoReal < 0 ? 'bg-red-50' : 'bg-primary/10'}`}>
            <DollarSign className={`w-6 h-6 ${kpis.saldoReal < 0 ? 'text-red-400' : 'text-primary'}`} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-purple-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">{t('dashboard:kpi_revenue', 'Faturamento')}</p>
            <p className="text-2xl font-bold text-slate-800 mt-2">{fmt(kpis.totalFaturamento)}</p>
            <p className="text-emerald-500 text-xs font-medium mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {t('dashboard:total_entries', 'Total entradas')}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-emerald-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-red-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">{t('dashboard:kpi_expenses', 'Despesas')}</p>
            <p className="text-2xl font-bold text-slate-800 mt-2">{fmt(kpis.totalDespesas)}</p>
            <p className="text-red-400 text-xs font-medium mt-2 flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> {t('dashboard:total_exits', 'Total saídas')}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
            <TrendingDown className="w-6 h-6 text-red-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-purple-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">{t('dashboard:kpi_avg_ticket', 'Ticket Médio')}</p>
            <p className="text-2xl font-bold text-slate-800 mt-2">{fmt(kpis.ticketMedio)}</p>
            <p className="text-secondary text-xs font-medium mt-2">{t('dashboard:per_appointment', 'Por atendimento')}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-secondary" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Gráfico de barras — últimos 7 dias */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-purple-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-base font-semibold text-slate-700">
              {t('dashboard:cashflow_7d', 'Fluxo de Caixa — Últimos 7 Dias')}
            </h3>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-primary" />
                <span className="text-slate-500">Entradas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-red-400" />
                <span className="text-slate-500">Saídas</span>
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between gap-3 h-52">
            {last7Days.map((d, i) => {
              const profit = d.entries - d.expenses;
              const margin = d.entries > 0 ? ((profit / d.entries) * 100).toFixed(0) : 0;

              return (
                <div key={i} className="flex flex-col items-center flex-1 group relative h-full">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-2 py-1 rounded-lg z-10 whitespace-nowrap pointer-events-none">
                    <p>Lucro: {fmt(profit)}</p>
                    <p>Margem: {margin}%</p>
                  </div>

                  <div className="flex items-end gap-1 w-full h-full">
                    {/* Barra Entradas */}
                    <div
                      className="flex-1 rounded-t-md bg-gradient-to-t from-secondary to-primary transition-all duration-700 min-h-[2px]"
                      style={{ height: `${Math.max((d.entries / maxVal) * 100, 2)}%` }}
                      title={`Entrada: ${fmt(d.entries)}`}
                    />
                    {/* Barra Saídas */}
                    <div
                      className="flex-1 rounded-t-md bg-red-400/80 transition-all duration-700 min-h-[2px]"
                      style={{ height: `${Math.max((d.expenses / maxVal) * 100, 2)}%` }}
                      title={`Saída: ${fmt(d.expenses)}`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 capitalize font-medium">{d.label}</span>
                </div>
              );
            })}
          </div>
          {allRecords.length === 0 && allDespesas.length === 0 && (
            <p className="text-center text-xs text-slate-400 mt-4">
              Nenhum dado financeiro nos últimos 7 dias.
            </p>
          )}
        </div>

        {/* Distribuição por forma de pagamento */}
        <div className="bg-white rounded-3xl shadow-sm border border-purple-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-purple-50">
            <h3 className="text-base font-semibold text-slate-700">
              {t('dashboard:payment_methods_dist', 'Distribuição por Forma de Pagamento')}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-purple-50/50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 font-medium">Método</th>
                  <th className="px-5 py-3 font-medium text-right">Volume (R$)</th>
                  <th className="px-5 py-3 font-medium text-right">Qtd</th>
                  <th className="px-5 py-3 font-medium text-right">% do Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50">
                {useMemo(() => paymentMethods.map(method => {
                  const recs = kpis.monthRecords.filter(r => r.pagamento === method);
                  const subtotal = recs.reduce(
                    (s, r) => s + parseFloat(String(r.valor || '0').replace(',', '.')), 0
                  );
                  const pct =
                    kpis.totalFaturamento > 0
                      ? ((subtotal / kpis.totalFaturamento) * 100).toFixed(1)
                      : '0.0';
                  return (
                    <tr key={method} className="hover:bg-purple-50/30">
                      <td className="px-5 py-4 font-medium text-slate-700">{method}</td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-800">
                        {fmt(subtotal)}
                      </td>
                      <td className="px-5 py-4 text-right text-slate-600">{recs.length}</td>
                      <td className="px-5 py-4 text-right text-slate-600">{pct}%</td>
                    </tr>
                  );
                }), [kpis.monthRecords, kpis.totalFaturamento])}
              </tbody>
            </table>
          </div>
        </div>

        {/* Distribuição por categoria de despesa */}
        <div className="bg-white rounded-3xl shadow-sm border border-red-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-red-50 bg-red-50/20">
            <h3 className="text-base font-semibold text-slate-700">
              {t('dashboard:expenses_dist', 'Distribuição de Despesas')}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-red-50/40 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 font-medium">Categoria</th>
                  <th className="px-5 py-3 font-medium text-right">Volume (R$)</th>
                  <th className="px-5 py-3 font-medium text-right">% do Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-50">
                {useMemo(() => CATEGORIAS_DESPESA.map(cat => {
                  const recs = kpis.monthDespesas.filter(d => d.categoria === cat);
                  const subtotal = recs.reduce(
                    (s, d) => s + parseFloat(d.valor || '0'), 0
                  );
                  const pct =
                    kpis.totalDespesas > 0
                      ? ((subtotal / kpis.totalDespesas) * 100).toFixed(1)
                      : '0.0';
                  return (
                    <tr key={cat} className="hover:bg-red-50/10">
                      <td className="px-5 py-4 font-medium text-slate-700">{cat}</td>
                      <td className="px-5 py-4 text-right font-semibold text-red-500">
                        {fmt(subtotal)}
                      </td>
                      <td className="px-5 py-4 text-right text-slate-600">{pct}%</td>
                    </tr>
                  );
                }), [kpis.monthDespesas, kpis.totalDespesas])}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
