import { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, PieChart, Activity
} from 'lucide-react';
import { 
  subscribeContasPagar, subscribeContasReceber,
  ContaPagar, ContaReceber
} from '../../services/dataService';

export default function RelatoriosFinanceirosPage() {
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubsPagar = subscribeContasPagar((data) => {
      setContasPagar(data);
    });
    
    let unsubsReceber = subscribeContasReceber((data) => {
      setContasReceber(data);
      setLoading(false);
    });

    return () => {
      unsubsPagar();
      unsubsReceber();
    };
  }, []);

  if (loading) {
    return (
      <div className="h-full bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalReceitas = contasReceber.reduce((acc, c) => acc + (Number(c.valor) || 0), 0);
  const totalDespesas = contasPagar.reduce((acc, c) => acc + (Number(c.valor) || 0), 0);
  const saldo = totalReceitas - totalDespesas;

  const receitasPagas = contasReceber.filter(c => c.status === 'recebido').reduce((acc, c) => acc + (Number(c.valor) || 0), 0);
  const despesasPagas = contasPagar.filter(c => c.status === 'pago').reduce((acc, c) => acc + (Number(c.valor) || 0), 0);
  const saldoRealizado = receitasPagas - despesasPagas;

  return (
    <div className="h-full bg-base overflow-y-auto">
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <PieChart className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Relatórios Financeiros</h1>
          </div>
          <p className="text-purple-200">
            Visão geral gerencial da saúde financeira da clínica.
          </p>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
            <h3 className="text-white/60 font-medium mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Total de Receitas (Previsto)
            </h3>
            <p className="text-3xl font-bold text-emerald-400">
              R$ {totalReceitas.toFixed(2)}
            </p>
            <p className="text-sm text-white/40 mt-2">
              Realizado: R$ {receitasPagas.toFixed(2)}
            </p>
          </div>

          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/10 rounded-full blur-2xl"></div>
            <h3 className="text-white/60 font-medium mb-1 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" /> Total de Despesas (Previsto)
            </h3>
            <p className="text-3xl font-bold text-red-400">
              R$ {totalDespesas.toFixed(2)}
            </p>
            <p className="text-sm text-white/40 mt-2">
              Realizado: R$ {despesasPagas.toFixed(2)}
            </p>
          </div>

          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl relative overflow-hidden">
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl ${saldo >= 0 ? 'bg-blue-500/10' : 'bg-orange-500/10'}`}></div>
            <h3 className="text-white/60 font-medium mb-1 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Saldo Previsto
            </h3>
            <p className={`text-3xl font-bold ${saldo >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
              R$ {saldo.toFixed(2)}
            </p>
            <p className="text-sm text-white/40 mt-2">
              Saldo Realizado: R$ {saldoRealizado.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Em Breve - Mais Gráficos */}
        <div className="p-12 border-2 border-dashed border-white/10 rounded-2xl text-center flex flex-col items-center justify-center gap-4">
          <Activity className="w-12 h-12 text-white/20" />
          <h2 className="text-xl font-bold text-white/50">Gráficos Detalhados em Breve</h2>
          <p className="text-white/40 max-w-md">
            Em atualizações futuras, esta tela contará com gráficos de fluxo de caixa, DRE gerencial, e análise por centro de custo/categoria.
          </p>
        </div>

      </div>
    </div>
  );
}
