import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Search, TrendingUp, TrendingDown, Wallet, Package,
  AlertCircle, X, Trash2, ArrowDownCircle, ArrowUpCircle, Receipt, Target,
} from 'lucide-react';
import { Metas, subscribeMetas, saveMetas } from '../../services/precificacao';
import {
  subscribeContasReceber, subscribeContasPagar, subscribeCategoriasFinanceiras, subscribeCaixaComData,
  saveContaReceber, saveContaPagar, deleteContaReceber, deleteContaPagar, saveCategoriaFinanceira,
  ContaReceber, ContaPagar, CategoriaFinanceira,
} from '../../services/dataService';

/**
 * Painel Financeiro — visão do mês, evolução mês a mês e lançamentos numa tela só.
 *
 * Fontes: Contas a Receber, Contas a Pagar e o Caixa (PDV).
 * Investimentos (equipamentos) ficam fora do lucro operacional, para o lucro do dia a dia
 * não sumir debaixo do custo de montar a estrutura.
 */

type Tipo = 'entrada' | 'saida';
type Origem = 'receber' | 'pagar' | 'caixa';
type Situacao = 'realizado' | 'pendente' | 'atrasado' | 'cancelado';

interface Lanc {
  id: string;
  origem: Origem;
  tipo: Tipo;
  data: string; // AAAA-MM-DD (realizado: data do pagamento; pendente: vencimento)
  valor: number;
  descricao: string;
  categoria: string;
  contraparte: string;
  forma: string;
  situacao: Situacao;
  investimento: boolean;
  bruto?: ContaReceber | ContaPagar;
}

const FORMAS = ['Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Boleto', 'Transferência', 'Outro'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_LONGOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const brl0 = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const dataBR = (iso: string) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');
const somaMes = (ym: string, n: number) => {
  const [a, m] = ym.split('-').map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const nomeMes = (ym: string) => {
  const [a, m] = ym.split('-').map(Number);
  return `${MESES_LONGOS[m - 1]} de ${a}`;
};
const num = (v: any) => {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').replace(/[^\d,.-]/g, '');
  return Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s) || 0;
};
const semUndefined = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
const ehInvestimento = (nomeCategoria: string, cat?: CategoriaFinanceira, flag?: boolean) =>
  !!flag || !!cat?.investimento || /invest/i.test(nomeCategoria || '');

export default function PainelFinanceiro() {
  const [receber, setReceber] = useState<ContaReceber[]>([]);
  const [pagar, setPagar] = useState<ContaPagar[]>([]);
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [caixa, setCaixa] = useState<{ entradas: any[]; saidas: any[] }>({ entradas: [], saidas: [] });
  const [carregando, setCarregando] = useState(true);

  const [mes, setMes] = useState(hoje().slice(0, 7));
  const [filtro, setFiltro] = useState<'todos' | 'entrada' | 'saida' | 'pendente'>('todos');
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<Partial<Lanc> | null>(null);
  const [metas, setMetas] = useState<Metas>({});
  const [editarMetas, setEditarMetas] = useState(false);

  useEffect(() => {
    const u1 = subscribeContasReceber(d => { setReceber(d); setCarregando(false); });
    const u2 = subscribeContasPagar(setPagar);
    const u3 = subscribeCategoriasFinanceiras(setCategorias);
    const u4 = subscribeCaixaComData(setCaixa);
    const u5 = subscribeMetas(setMetas);
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, []);

  const catPorId = useMemo(() => new Map(categorias.map(c => [c.id, c])), [categorias]);
  const catPorNome = useMemo(() => new Map(categorias.map(c => [c.nome, c])), [categorias]);

  // ── Todos os lançamentos num formato só ───────────────────────────────
  const lancamentos = useMemo<Lanc[]>(() => {
    const h = hoje();
    const situacao = (status: string, venc: string): Situacao => {
      if (status === 'recebido' || status === 'pago') return 'realizado';
      if (status === 'cancelado') return 'cancelado';
      return venc && venc < h ? 'atrasado' : 'pendente';
    };
    const lista: Lanc[] = [];
    for (const c of receber) {
      const venc = String(c.dataVencimento || c.vencimento || '').slice(0, 10);
      const sit = situacao(c.status, venc);
      const cat = (c.categoriaId && catPorId.get(c.categoriaId)) || undefined;
      lista.push({
        id: c.id, origem: 'receber', tipo: 'entrada',
        data: sit === 'realizado' ? String(c.recebidoEm || venc).slice(0, 10) : venc,
        valor: Number(c.valor) || 0,
        descricao: c.descricao || '',
        categoria: c.categoriaNome || cat?.nome || 'Sem categoria',
        contraparte: c.clienteNome || '',
        forma: c.formaPagamento || '',
        situacao: sit, investimento: false, bruto: c,
      });
    }
    for (const c of pagar) {
      const venc = String(c.dataVencimento || c.vencimento || '').slice(0, 10);
      const sit = situacao(c.status, venc);
      const nomeCat = c.categoriaNome || (c.categoriaId && catPorId.get(c.categoriaId)?.nome) || 'Sem categoria';
      const cat = (c.categoriaId && catPorId.get(c.categoriaId)) || catPorNome.get(nomeCat);
      lista.push({
        id: c.id, origem: 'pagar', tipo: 'saida',
        data: sit === 'realizado' ? String(c.pagoEm || venc).slice(0, 10) : venc,
        valor: Number(c.valor) || 0,
        descricao: c.descricao || '',
        categoria: nomeCat,
        contraparte: c.fornecedor || '',
        forma: c.formaPagamento || '',
        situacao: sit, investimento: ehInvestimento(nomeCat, cat, c.investimento), bruto: c,
      });
    }
    for (const r of caixa.entradas) {
      lista.push({
        id: `cx_${r._date}_${r._id}`, origem: 'caixa', tipo: 'entrada', data: r._date,
        valor: num(r.valor), descricao: r.procedimento || 'Venda no caixa', categoria: 'Caixa (PDV)',
        contraparte: [r.cliente, r.animal].filter(Boolean).join(' · '), forma: r.pagamento || '',
        situacao: r.pago === false ? 'pendente' : 'realizado', investimento: false,
      });
    }
    for (const d of caixa.saidas) {
      lista.push({
        id: `cxd_${d._date}_${d._id}`, origem: 'caixa', tipo: 'saida', data: d._date,
        valor: num(d.valor), descricao: d.descricao || 'Despesa do caixa', categoria: d.categoria || 'Despesas do caixa',
        contraparte: '', forma: '', situacao: 'realizado', investimento: false,
      });
    }
    return lista.sort((a, b) => b.data.localeCompare(a.data));
  }, [receber, pagar, caixa, catPorId, catPorNome]);

  // ── Números por mês (só o que já foi pago ou recebido) ────────────────
  const resumoMes = (ym: string) => {
    const r = { entradas: 0, saidas: 0, invest: 0, qtd: 0 };
    for (const l of lancamentos) {
      if (l.situacao !== 'realizado' || !l.data.startsWith(ym)) continue;
      if (l.tipo === 'entrada') { r.entradas += l.valor; r.qtd++; }
      else if (l.investimento) r.invest += l.valor;
      else r.saidas += l.valor;
    }
    const lucro = r.entradas - r.saidas;
    return { ...r, lucro, margem: r.entradas > 0 ? lucro / r.entradas : 0, caixa: lucro - r.invest };
  };

  const atual = resumoMes(mes);
  const anterior = resumoMes(somaMes(mes, -1));
  const evolucao = Array.from({ length: 6 }, (_, i) => somaMes(mes, i - 5)).map(ym => ({ ym, ...resumoMes(ym) }));
  const maxEvol = Math.max(1, ...evolucao.map(e => Math.max(e.entradas, e.saidas + e.invest)));

  const acumulado = useMemo(() => {
    const a = { entradas: 0, saidas: 0, invest: 0 };
    for (const l of lancamentos) {
      if (l.situacao !== 'realizado') continue;
      if (l.tipo === 'entrada') a.entradas += l.valor;
      else if (l.investimento) a.invest += l.valor;
      else a.saidas += l.valor;
    }
    return a;
  }, [lancamentos]);

  const pendencias = useMemo(() => {
    const p = { receber: 0, receberAtraso: 0, pagar: 0, pagarAtraso: 0 };
    for (const l of lancamentos) {
      if (l.situacao !== 'pendente' && l.situacao !== 'atrasado') continue;
      if (l.tipo === 'entrada') { p.receber += l.valor; if (l.situacao === 'atrasado') p.receberAtraso++; }
      else { p.pagar += l.valor; if (l.situacao === 'atrasado') p.pagarAtraso++; }
    }
    return p;
  }, [lancamentos]);

  const doMes = lancamentos.filter(l => l.data.startsWith(mes) && l.situacao !== 'cancelado');

  const porCategoria = (() => {
    const m = new Map<string, { valor: number; invest: boolean }>();
    for (const l of doMes) {
      if (l.tipo !== 'saida' || l.situacao !== 'realizado') continue;
      const v = m.get(l.categoria) || { valor: 0, invest: l.investimento };
      v.valor += l.valor;
      m.set(l.categoria, v);
    }
    return [...m.entries()].sort((a, b) => b[1].valor - a[1].valor);
  })();
  const totalSaidasMes = porCategoria.reduce((s, [, v]) => s + v.valor, 0);

  const porForma = (() => {
    const m = new Map<string, number>();
    for (const l of doMes) {
      if (l.tipo !== 'entrada' || l.situacao !== 'realizado') continue;
      const f = l.forma || 'Não informado';
      m.set(f, (m.get(f) || 0) + l.valor);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  })();

  const visiveis = doMes.filter(l => {
    if (filtro === 'entrada' && l.tipo !== 'entrada') return false;
    if (filtro === 'saida' && l.tipo !== 'saida') return false;
    if (filtro === 'pendente' && l.situacao !== 'pendente' && l.situacao !== 'atrasado') return false;
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return [l.descricao, l.categoria, l.contraparte, l.forma].join(' ').toLowerCase().includes(q);
  });

  // ── Metas: hoje, esta semana (seg a dom) e o mês escolhido ──────────────
  const resumoIntervalo = (de: string, ate: string) => {
    let ent = 0, sai = 0;
    for (const l of lancamentos) {
      if (l.situacao !== 'realizado' || l.data < de || l.data > ate) continue;
      if (l.tipo === 'entrada') ent += l.valor;
      else if (!l.investimento) sai += l.valor;
    }
    return { faturamento: ent, lucro: ent - sai };
  };
  const hj = hoje();
  const dHoje = new Date(hj + 'T12:00:00');
  const seg = new Date(dHoje); seg.setDate(dHoje.getDate() - ((dHoje.getDay() + 6) % 7));
  const dom = new Date(seg); dom.setDate(seg.getDate() + 6);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const rHoje = resumoIntervalo(hj, hj);
  const rSemana = resumoIntervalo(iso(seg), iso(dom));
  const rMes = { faturamento: atual.entradas, lucro: atual.lucro };
  const diasNoMes = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5)), 0).getDate();
  const diaAtual = mes === hj.slice(0, 7) ? dHoje.getDate() : mes < hj.slice(0, 7) ? diasNoMes : 0;
  const ritmoMes = diaAtual > 0 ? (atual.lucro / diaAtual) * diasNoMes : 0;
  const temMetas = Object.values(metas).some(v => v != null && Number(v) > 0);

  const variacao = (a: number, b: number) => {
    if (!b) return null;
    const v = (a - b) / Math.abs(b);
    return { v, txt: `${v >= 0 ? '+' : ''}${(v * 100).toFixed(0)}% vs mês anterior` };
  };

  if (carregando) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const vEnt = variacao(atual.entradas, anterior.entradas);
  const vLuc = variacao(atual.lucro, anterior.lucro);

  return (
    <div className="h-full overflow-y-auto bg-[#FBF7EE]">
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Painel Financeiro</h1>
            <p className="text-sm text-slate-500">O que entrou, o que saiu e quanto sobrou.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setMes(somaMes(mes, -1))} className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50" aria-label="Mês anterior">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="month"
              value={mes}
              onChange={e => e.target.value && setMes(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700"
            />
            <button onClick={() => setMes(somaMes(mes, 1))} className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50" aria-label="Próximo mês">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={() => setEditando({ tipo: 'entrada', data: hoje(), situacao: 'realizado' })} className="ml-2 flex items-center gap-1 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold">
              <Plus className="w-4 h-4" /> Entrada
            </button>
            <button onClick={() => setEditando({ tipo: 'saida', data: hoje(), situacao: 'realizado' })} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-sm font-bold">
              <Plus className="w-4 h-4" /> Saída
            </button>
          </div>
        </div>

        {/* Metas */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2"><Target className="w-5 h-5 text-teal-700" /> Metas</h2>
            <button onClick={() => setEditarMetas(true)} className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700">
              {temMetas ? 'Editar metas' : 'Definir metas'}
            </button>
          </div>
          {!temMetas ? (
            <p className="text-sm text-slate-500">Defina quanto quer lucrar (e faturar, se quiser) por dia, por semana e por mês. O painel mostra quanto já foi e quanto falta.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-5">
              <BlocoMeta titulo="Hoje" lucro={rHoje.lucro} fat={rHoje.faturamento} metaLucro={metas.lucroDia} metaFat={metas.faturamentoDia} />
              <BlocoMeta titulo="Esta semana" lucro={rSemana.lucro} fat={rSemana.faturamento} metaLucro={metas.lucroSemana} metaFat={metas.faturamentoSemana} />
              <BlocoMeta titulo={nomeMes(mes)} lucro={rMes.lucro} fat={rMes.faturamento} metaLucro={metas.lucroMes} metaFat={metas.faturamentoMes}
                extra={diaAtual > 0 && diaAtual < diasNoMes ? `No ritmo atual, o lucro do mês fecha em ${brl0(ritmoMes)}.` : undefined} />
            </div>
          )}
        </div>

        {/* Cartões do mês */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Cartao titulo="Entradas" valor={brl(atual.entradas)} icone={<TrendingUp className="w-5 h-5" />} cor="text-teal-700"
            detalhe={`${atual.qtd} recebimento${atual.qtd === 1 ? '' : 's'}${atual.qtd ? ` · ticket médio ${brl0(atual.entradas / atual.qtd)}` : ''}`}
            variacao={vEnt} />
          <Cartao titulo="Custos do dia a dia" valor={brl(atual.saidas)} icone={<TrendingDown className="w-5 h-5" />} cor="text-pink-700"
            detalhe="Insumos, combustível, marketing, ferramentas…" />
          <Cartao titulo="Lucro operacional" valor={brl(atual.lucro)} icone={<Wallet className="w-5 h-5" />}
            cor={atual.lucro >= 0 ? 'text-teal-700' : 'text-red-600'}
            detalhe={atual.entradas ? `Margem de ${pct(atual.margem)}` : 'Sem entradas no mês'} variacao={vLuc} destaque />
          <Cartao titulo="Investimentos" valor={brl(atual.invest)} icone={<Package className="w-5 h-5" />} cor="text-slate-600"
            detalhe={`Sobra depois do investimento: ${brl(atual.caixa)}`} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4 items-start">
          {/* Evolução */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800">Últimos 6 meses</h2>
              <div className="flex gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><i className="w-3 h-3 rounded bg-teal-600 inline-block" /> Entradas</span>
                <span className="flex items-center gap-1"><i className="w-3 h-3 rounded bg-pink-400 inline-block" /> Custos</span>
                <span className="flex items-center gap-1"><i className="w-3 h-3 rounded bg-slate-300 inline-block" /> Investimento</span>
              </div>
            </div>
            <div className="flex items-end gap-3 h-48">
              {evolucao.map(e => {
                const [a, m] = e.ym.split('-').map(Number);
                return (
                  <button key={e.ym} onClick={() => setMes(e.ym)} className={`flex-1 flex flex-col items-center gap-1 group ${e.ym === mes ? '' : 'opacity-80 hover:opacity-100'}`}>
                    <div className="flex items-end gap-1 h-40 w-full justify-center">
                      <div className="w-1/3 max-w-[28px] bg-teal-600 rounded-t-md" style={{ height: `${(e.entradas / maxEvol) * 100}%` }} title={`Entradas ${brl(e.entradas)}`} />
                      <div className="w-1/3 max-w-[28px] flex flex-col justify-end" style={{ height: '100%' }}>
                        <div className="bg-slate-300 rounded-t-md" style={{ height: `${(e.invest / maxEvol) * 100}%` }} title={`Investimento ${brl(e.invest)}`} />
                        <div className={`bg-pink-400 ${e.invest ? '' : 'rounded-t-md'}`} style={{ height: `${(e.saidas / maxEvol) * 100}%` }} title={`Custos ${brl(e.saidas)}`} />
                      </div>
                    </div>
                    <span className={`text-xs ${e.ym === mes ? 'font-bold text-slate-800' : 'text-slate-500'}`}>{MESES[m - 1]}{m === 1 ? `/${String(a).slice(2)}` : ''}</span>
                    <span className={`text-[11px] font-semibold ${e.lucro >= 0 ? 'text-teal-700' : 'text-red-600'}`}>{e.entradas || e.saidas ? brl0(e.lucro) : '—'}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-3">O valor embaixo de cada mês é o lucro operacional (entradas menos custos, sem o investimento). Clique num mês para abrir.</p>
          </div>

          {/* Pendências e acumulado */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-800 mb-3">Em aberto</h2>
              <Linha rotulo="A receber" valor={brl(pendencias.receber)} cor="text-teal-700"
                extra={pendencias.receberAtraso ? `${pendencias.receberAtraso} atrasado${pendencias.receberAtraso > 1 ? 's' : ''}` : ''} />
              <Linha rotulo="A pagar" valor={brl(pendencias.pagar)} cor="text-pink-700"
                extra={pendencias.pagarAtraso ? `${pendencias.pagarAtraso} vencido${pendencias.pagarAtraso > 1 ? 's' : ''}` : ''} />
              {pendencias.receber + pendencias.pagar > 0 && (
                <button onClick={() => setFiltro('pendente')} className="text-xs font-semibold text-teal-700 mt-2 hover:underline">Ver pendências do mês</button>
              )}
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-800 mb-3">Desde o começo</h2>
              <Linha rotulo="Entradas" valor={brl(acumulado.entradas)} />
              <Linha rotulo="Custos do dia a dia" valor={brl(acumulado.saidas)} />
              <Linha rotulo="Lucro operacional" valor={brl(acumulado.entradas - acumulado.saidas)} cor={acumulado.entradas - acumulado.saidas >= 0 ? 'text-teal-700' : 'text-red-600'} forte />
              <Linha rotulo="Investimentos" valor={brl(acumulado.invest)} />
              <Linha rotulo="Saldo final" valor={brl(acumulado.entradas - acumulado.saidas - acumulado.invest)}
                cor={acumulado.entradas - acumulado.saidas - acumulado.invest >= 0 ? 'text-teal-700' : 'text-red-600'} forte />
            </div>
          </div>
        </div>

        {/* Para onde foi e de onde veio */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6">
            <h2 className="font-bold text-slate-800 mb-4">Para onde foi o dinheiro em {MESES_LONGOS[Number(mes.slice(5)) - 1].toLowerCase()}</h2>
            {porCategoria.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma saída paga neste mês.</p>
            ) : (
              <div className="space-y-3">
                {porCategoria.map(([nome, v]) => (
                  <Barra key={nome} rotulo={nome + (v.invest ? ' · investimento' : '')} valor={v.valor} total={totalSaidasMes}
                    cor={v.invest ? 'bg-slate-400' : 'bg-pink-400'} />
                ))}
              </div>
            )}
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 p-6">
            <h2 className="font-bold text-slate-800 mb-4">Como você recebeu</h2>
            {porForma.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma entrada recebida neste mês.</p>
            ) : (
              <div className="space-y-3">
                {porForma.map(([f, v]) => <Barra key={f} rotulo={f} valor={v} total={atual.entradas} cor="bg-teal-600" />)}
              </div>
            )}
          </div>
        </div>

        {/* Lançamentos */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-bold text-slate-800">Lançamentos de {nomeMes(mes).toLowerCase()}</h2>
            <div className="flex flex-wrap items-center gap-2">
              {([['todos', 'Todos'], ['entrada', 'Entradas'], ['saida', 'Saídas'], ['pendente', 'Em aberto']] as const).map(([k, r]) => (
                <button key={k} onClick={() => setFiltro(k)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold ${filtro === k ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {r}
                </button>
              ))}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar…"
                  className="pl-9 pr-3 py-1.5 rounded-full border border-slate-200 text-sm w-48" />
              </div>
            </div>
          </div>

          {visiveis.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Nenhum lançamento {filtro !== 'todos' || busca ? 'com esse filtro ' : ''}neste mês.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {visiveis.map(l => (
                <button key={l.id} onClick={() => l.origem !== 'caixa' && setEditando(l)}
                  className={`w-full flex items-center gap-3 py-3 text-left ${l.origem === 'caixa' ? 'cursor-default' : 'hover:bg-slate-50'} rounded-xl px-2`}>
                  <div className={`p-2 rounded-xl ${l.tipo === 'entrada' ? 'bg-teal-50 text-teal-700' : l.investimento ? 'bg-slate-100 text-slate-500' : 'bg-pink-50 text-pink-700'}`}>
                    {l.tipo === 'entrada' ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{l.contraparte && l.tipo === 'entrada' ? l.contraparte : l.descricao}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {dataBR(l.data)} · {l.categoria}
                      {l.tipo === 'entrada' && l.contraparte && l.descricao ? ` · ${l.descricao}` : ''}
                      {l.tipo === 'saida' && l.contraparte ? ` · ${l.contraparte}` : ''}
                      {l.forma ? ` · ${l.forma}` : ''}
                      {l.origem === 'caixa' ? ' · lançado no Caixa' : ''}
                    </p>
                  </div>
                  {l.situacao !== 'realizado' && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${l.situacao === 'atrasado' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                      {l.situacao === 'atrasado' ? (l.tipo === 'entrada' ? 'Atrasado' : 'Vencido') : l.tipo === 'entrada' ? 'A receber' : 'A pagar'}
                    </span>
                  )}
                  <span className={`text-sm font-bold whitespace-nowrap ${l.tipo === 'entrada' ? 'text-teal-700' : 'text-slate-700'}`}>
                    {l.tipo === 'entrada' ? '+' : '−'} {brl(l.valor)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {editarMetas && <ModalMetas metas={metas} onFechar={() => setEditarMetas(false)} />}

      {editando && (
        <ModalLancamento
          inicial={editando}
          categorias={categorias}
          onFechar={() => setEditando(null)}
        />
      )}
    </div>
  );
}

// ── Peças da tela ───────────────────────────────────────────────────────

function BlocoMeta({ titulo, lucro, fat, metaLucro, metaFat, extra }: {
  titulo: string; lucro: number; fat: number; metaLucro?: number | null; metaFat?: number | null; extra?: string;
}) {
  const linha = (rotulo: string, valor: number, meta?: number | null) => {
    if (!meta || meta <= 0) return null;
    const p = Math.max(0, Math.min(1, valor / meta));
    const ok = valor >= meta;
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">{rotulo}</span>
          <span className={`font-semibold ${ok ? 'text-teal-700' : 'text-slate-700'}`}>{brl0(valor)} <span className="text-slate-400 font-normal">de {brl0(meta)}</span></span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${ok ? 'bg-teal-600' : 'bg-pink-400'}`} style={{ width: `${Math.max(2, p * 100)}%` }} />
        </div>
        <p className={`text-[11px] ${ok ? 'text-teal-700 font-semibold' : 'text-slate-400'}`}>{ok ? 'Meta batida!' : `Faltam ${brl0(meta - valor)}`}</p>
      </div>
    );
  };
  const algum = (metaLucro && metaLucro > 0) || (metaFat && metaFat > 0);
  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-slate-700">{titulo}</p>
      {algum ? <>{linha('Lucro', lucro, metaLucro)}{linha('Faturamento', fat, metaFat)}</> : <p className="text-xs text-slate-400">Sem meta para este período.</p>}
      {extra && <p className="text-[11px] text-slate-500">{extra}</p>}
    </div>
  );
}

function ModalMetas({ metas, onFechar }: { metas: Metas; onFechar: () => void }) {
  const [m, setM] = useState<Record<string, string>>(Object.fromEntries(Object.entries(metas).map(([k, v]) => [k, v != null ? String(v).replace('.', ',') : ''])));
  const [salvando, setSalvando] = useState(false);
  const campoM = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500';
  const salvar = async () => {
    setSalvando(true);
    const out: Metas = {};
    for (const k of ['lucroDia', 'lucroSemana', 'lucroMes', 'faturamentoDia', 'faturamentoSemana', 'faturamentoMes'] as const) {
      const v = num(m[k]);
      out[k] = v > 0 ? v : null;
    }
    await saveMetas(out);
    onFechar();
  };
  const linhas: [string, string, string][] = [['Por dia', 'lucroDia', 'faturamentoDia'], ['Por semana', 'lucroSemana', 'faturamentoSemana'], ['Por mês', 'lucroMes', 'faturamentoMes']];
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onFechar}>
      <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">Suas metas</h3>
          <button onClick={onFechar}><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-slate-500">Deixe em branco o que não quiser acompanhar. Lucro = entradas recebidas menos custos pagos, sem os investimentos.</p>
        <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-slate-500">
          <span />
          <span>Lucro (R$)</span>
          <span>Faturamento (R$)</span>
          {linhas.map(([rot, kl, kf]) => (
            <div key={rot} className="contents">
              <span className="self-center text-slate-700">{rot}</span>
              <input value={m[kl] || ''} onChange={e => setM({ ...m, [kl]: e.target.value })} inputMode="decimal" className={campoM} placeholder="—" />
              <input value={m[kf] || ''} onChange={e => setM({ ...m, [kf]: e.target.value })} inputMode="decimal" className={campoM} placeholder="—" />
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onFechar} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Cancelar</button>
          <button disabled={salvando} onClick={salvar} className="flex-1 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-bold disabled:opacity-50">Salvar metas</button>
        </div>
      </div>
    </div>
  );
}

function Cartao({ titulo, valor, icone, cor, detalhe, variacao, destaque }: {
  titulo: string; valor: string; icone: React.ReactNode; cor: string; detalhe?: string;
  variacao?: { v: number; txt: string } | null; destaque?: boolean;
}) {
  return (
    <div className={`rounded-3xl border p-5 ${destaque ? 'bg-white border-teal-600 ring-1 ring-teal-600' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wide">
        {titulo}<span className={cor}>{icone}</span>
      </div>
      <p className={`text-2xl font-bold mt-2 ${cor}`}>{valor}</p>
      {detalhe && <p className="text-xs text-slate-500 mt-1">{detalhe}</p>}
      {variacao && (
        <p className={`text-xs font-semibold mt-1 ${variacao.v >= 0 ? 'text-teal-700' : 'text-red-600'}`}>{variacao.txt}</p>
      )}
    </div>
  );
}

function Linha({ rotulo, valor, cor = 'text-slate-700', extra, forte }: { rotulo: string; valor: string; cor?: string; extra?: string; forte?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 text-sm ${forte ? 'border-t border-slate-100 mt-1 pt-2' : ''}`}>
      <span className="text-slate-500">{rotulo}{extra && <span className="ml-2 text-[11px] font-bold text-red-600">{extra}</span>}</span>
      <span className={`${forte ? 'font-bold' : 'font-semibold'} ${cor}`}>{valor}</span>
    </div>
  );
}

function Barra({ rotulo, valor, total, cor }: { rotulo: string; valor: number; total: number; cor: string }) {
  const p = total > 0 ? valor / total : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-700 truncate pr-2">{rotulo}</span>
        <span className="text-slate-600 font-semibold whitespace-nowrap">{brl(valor)} <span className="text-slate-400 font-normal">· {pct(p)}</span></span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${cor} rounded-full`} style={{ width: `${Math.max(2, p * 100)}%` }} />
      </div>
    </div>
  );
}

// ── Cadastro e edição ──────────────────────────────────────────────────

function ModalLancamento({ inicial, categorias, onFechar }: {
  inicial: Partial<Lanc>; categorias: CategoriaFinanceira[]; onFechar: () => void;
}) {
  const bruto = inicial.bruto as any;
  const [tipo, setTipo] = useState<Tipo>(inicial.tipo || 'entrada');
  const [data, setData] = useState(inicial.data || hoje());
  const [valor, setValor] = useState(inicial.valor ? String(inicial.valor).replace('.', ',') : '');
  const [descricao, setDescricao] = useState(inicial.descricao || '');
  const [contraparte, setContraparte] = useState(inicial.contraparte || '');
  const [forma, setForma] = useState(inicial.forma || (tipo === 'entrada' ? 'Pix' : ''));
  const [pago, setPago] = useState(inicial.situacao ? inicial.situacao === 'realizado' : true);
  const [categoriaId, setCategoriaId] = useState<string>(bruto?.categoriaId || '');
  const [novaCategoria, setNovaCategoria] = useState('');
  const [investimento, setInvestimento] = useState(!!inicial.investimento);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const editando = !!inicial.id;
  const cats = categorias.filter(c => c.tipo === (tipo === 'entrada' ? 'receita' : 'despesa')).sort((a, b) => a.nome.localeCompare(b.nome));

  useEffect(() => {
    if (!categoriaId && bruto?.categoriaNome) {
      const c = cats.find(x => x.nome === bruto.categoriaNome);
      if (c) setCategoriaId(c.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorias]);

  useEffect(() => {
    const c = categorias.find(x => x.id === categoriaId);
    if (c && tipo === 'saida' && (c.investimento || /invest/i.test(c.nome))) setInvestimento(true);
  }, [categoriaId, categorias, tipo]);

  const salvar = async () => {
    const v = num(valor);
    if (!v || v <= 0) return setErro('Informe o valor.');
    if (!data) return setErro('Informe a data.');
    setSalvando(true);
    setErro('');
    try {
      let catId = categoriaId;
      let catNome = categorias.find(c => c.id === catId)?.nome;
      if (catId === '__nova') {
        if (!novaCategoria.trim()) { setSalvando(false); return setErro('Dê um nome para a nova categoria.'); }
        catNome = novaCategoria.trim();
        catId = await saveCategoriaFinanceira({ nome: catNome, tipo: tipo === 'entrada' ? 'receita' : 'despesa', ...(investimento ? { investimento: true } : {}) });
      }
      const base = semUndefined({
        ...(editando && inicial.origem === (tipo === 'entrada' ? 'receber' : 'pagar') ? { id: inicial.id } : {}),
        descricao: descricao.trim() || (tipo === 'entrada' ? 'Atendimento' : 'Despesa'),
        valor: v,
        vencimento: data,
        dataVencimento: data,
        categoriaId: catId || undefined,
        categoriaNome: catNome || undefined,
        formaPagamento: forma || undefined,
      });
      if (tipo === 'entrada') {
        await saveContaReceber({
          ...base,
          status: pago ? 'recebido' : 'pendente',
          ...(pago ? { recebidoEm: data } : {}),
          ...(contraparte.trim() ? { clienteNome: contraparte.trim() } : {}),
        });
      } else {
        await saveContaPagar({
          ...base,
          status: pago ? 'pago' : 'pendente',
          ...(pago ? { pagoEm: data } : {}),
          ...(contraparte.trim() ? { fornecedor: contraparte.trim() } : {}),
          investimento,
        });
      }
      // Trocou de entrada para saída (ou o contrário): apaga o registro antigo
      if (editando && inicial.origem && inicial.origem !== (tipo === 'entrada' ? 'receber' : 'pagar')) {
        if (inicial.origem === 'receber') await deleteContaReceber(inicial.id!);
        else if (inicial.origem === 'pagar') await deleteContaPagar(inicial.id!);
      }
      onFechar();
    } catch (e: any) {
      console.error('Salvar lançamento:', e);
      setErro('Não foi possível salvar: ' + (e?.message || 'erro desconhecido'));
      setSalvando(false);
    }
  };

  const excluir = async () => {
    if (!editando || !inicial.id) return;
    if (!window.confirm('Excluir este lançamento?')) return;
    if (inicial.origem === 'receber') await deleteContaReceber(inicial.id);
    else if (inicial.origem === 'pagar') await deleteContaPagar(inicial.id);
    onFechar();
  };

  const campo = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onFechar}>
      <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{editando ? 'Editar lançamento' : tipo === 'entrada' ? 'Nova entrada' : 'Nova saída'}</h3>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(['entrada', 'saida'] as Tipo[]).map(t => (
            <button key={t} onClick={() => { setTipo(t); setCategoriaId(''); if (t === 'entrada') setInvestimento(false); }}
              className={`py-2 rounded-xl text-sm font-bold border ${tipo === t ? (t === 'entrada' ? 'bg-teal-700 text-white border-teal-700' : 'bg-pink-600 text-white border-pink-600') : 'bg-white text-slate-600 border-slate-200'}`}>
              {t === 'entrada' ? 'Entrada' : 'Saída'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-slate-600">Valor (R$)
            <input autoFocus inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" className={campo + ' mt-1 text-lg font-bold'} />
          </label>
          <label className="text-xs font-semibold text-slate-600">{pago ? (tipo === 'entrada' ? 'Recebido em' : 'Pago em') : 'Vencimento'}
            <input type="date" value={data} onChange={e => setData(e.target.value)} className={campo + ' mt-1'} />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={pago} onChange={e => setPago(e.target.checked)} className="w-4 h-4 accent-teal-700" />
          {tipo === 'entrada' ? 'Já recebi' : 'Já paguei'}
        </label>

        <label className="block text-xs font-semibold text-slate-600">{tipo === 'entrada' ? 'Cliente / tutor' : 'Fornecedor'}
          <input value={contraparte} onChange={e => setContraparte(e.target.value)} className={campo + ' mt-1'}
            placeholder={tipo === 'entrada' ? 'Nome de quem pagou' : 'Onde comprou'} />
        </label>

        <label className="block text-xs font-semibold text-slate-600">Descrição
          <input value={descricao} onChange={e => setDescricao(e.target.value)} className={campo + ' mt-1'}
            placeholder={tipo === 'entrada' ? 'Ex.: consulta domiciliar do Jorge' : 'Ex.: combustível, seringas…'} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-slate-600">Categoria
            <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className={campo + ' mt-1'}>
              <option value="">Sem categoria</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              <option value="__nova">+ Nova categoria…</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">Forma de pagamento
            <select value={forma} onChange={e => setForma(e.target.value)} className={campo + ' mt-1'}>
              <option value="">—</option>
              {[...new Set([...FORMAS, forma].filter(Boolean))].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
        </div>
        {categoriaId === '__nova' && (
          <input value={novaCategoria} onChange={e => setNovaCategoria(e.target.value)} placeholder="Nome da nova categoria" className={campo} />
        )}

        {tipo === 'saida' && (
          <label className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 rounded-xl p-3">
            <input type="checkbox" checked={investimento} onChange={e => setInvestimento(e.target.checked)} className="w-4 h-4 mt-0.5 accent-slate-600" />
            <span>É investimento (equipamento ou estrutura)<br />
              <span className="text-xs text-slate-500">Fica fora do lucro operacional do mês, mas entra no saldo.</span></span>
          </label>
        )}

        {erro && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {erro}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          {editando && (
            <button onClick={excluir} className="p-2.5 rounded-xl text-red-600 hover:bg-red-50" title="Excluir">
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <button onClick={onFechar} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Cancelar</button>
          <button disabled={salvando} onClick={salvar}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 ${tipo === 'entrada' ? 'bg-teal-700 hover:bg-teal-800' : 'bg-pink-600 hover:bg-pink-700'}`}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
