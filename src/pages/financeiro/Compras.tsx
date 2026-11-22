import { useEffect, useMemo, useState } from 'react';
import {
  Plus, X, Trash2, AlertCircle, CheckCircle2, ShoppingCart, Package, Pill, Wrench, Copy, ExternalLink, RotateCcw,
} from 'lucide-react';
import {
  ContaPagar, ContaReceber, CategoriaFinanceira,
  subscribeContasPagar, subscribeContasReceber, subscribeCategoriasFinanceiras, saveContaPagar, saveCategoriaFinanceira,
} from '../../services/dataService';
import {
  Insumo, ItemCompra, TipoCompra, Prioridade,
  subscribeInsumos, saveInsumo, subscribeCompras, saveCompra, deleteCompra, custoUnitario,
} from '../../services/precificacao';

/**
 * Planejamento de compras: o que precisa comprar, quando e quanto vai custar.
 * Ao marcar "Comprei", lança a saída no Contas a Pagar (equipamento entra como investimento)
 * e atualiza o preço do insumo na Precificação.
 */

const brl = (v: number) => (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (v: any) => {
  const s = String(v ?? '').trim().replace(/[^\d,.-]/g, '');
  return Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s) || 0;
};
const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const somaMes = (ym: string, n: number) => {
  const [a, m] = ym.split('-').map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const nomeMes = (ym?: string) => (ym ? `${MESES[Number(ym.slice(5)) - 1]} de ${ym.slice(0, 4)}` : 'Sem data definida');
const campo = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white';

const TIPOS: Record<TipoCompra, { rotulo: string; icone: any; categoria: string; investimento: boolean }> = {
  insumo: { rotulo: 'Insumo', icone: Package, categoria: 'Medicamentos e insumos', investimento: false },
  medicamento: { rotulo: 'Medicamento', icone: Pill, categoria: 'Medicamentos e insumos', investimento: false },
  equipamento: { rotulo: 'Equipamento', icone: Wrench, categoria: 'Equipamentos (investimento)', investimento: true },
};
const PRIORIDADES: Record<Prioridade, { rotulo: string; cor: string; ordem: number }> = {
  urgente: { rotulo: 'Urgente', cor: 'bg-red-50 text-red-700', ordem: 0 },
  importante: { rotulo: 'Importante', cor: 'bg-amber-50 text-amber-700', ordem: 1 },
  quando_der: { rotulo: 'Quando der', cor: 'bg-slate-100 text-slate-600', ordem: 2 },
};

export default function Compras() {
  const [itens, setItens] = useState<ItemCompra[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [pagar, setPagar] = useState<ContaPagar[]>([]);
  const [receber, setReceber] = useState<ContaReceber[]>([]);
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [editando, setEditando] = useState<Partial<ItemCompra> | null>(null);
  const [comprando, setComprando] = useState<ItemCompra | null>(null);
  const [verComprados, setVerComprados] = useState(false);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    const us = [subscribeCompras(setItens), subscribeInsumos(setInsumos), subscribeContasPagar(setPagar),
      subscribeContasReceber(setReceber), subscribeCategoriasFinanceiras(setCategorias)];
    return () => us.forEach(u => u());
  }, []);

  const mesAtual = hoje().slice(0, 7);

  // Quanto sobra por mês, em média, para comprar: lucro operacional dos últimos 3 meses fechados
  const sobraMedia = useMemo(() => {
    const meses = [1, 2, 3].map(n => somaMes(mesAtual, -n));
    let ent = 0, sai = 0;
    for (const c of receber) if (c.status === 'recebido' && meses.includes(String(c.recebidoEm || c.vencimento || '').slice(0, 7))) ent += Number(c.valor) || 0;
    for (const c of pagar) {
      if (c.status !== 'pago' || c.investimento || /invest/i.test(c.categoriaNome || '')) continue;
      if (meses.includes(String(c.pagoEm || c.vencimento || '').slice(0, 7))) sai += Number(c.valor) || 0;
    }
    return (ent - sai) / 3;
  }, [receber, pagar, mesAtual]);

  const planejados = itens.filter(i => i.status === 'planejado');
  const total = (l: ItemCompra[]) => l.reduce((s, i) => s + (Number(i.qtd) || 0) * (Number(i.precoUnit) || 0), 0);
  const doMes = planejados.filter(i => !i.mesPrevisto || i.mesPrevisto <= mesAtual);
  const urgentes = planejados.filter(i => i.prioridade === 'urgente');

  const grupos = useMemo(() => {
    const m = new Map<string, ItemCompra[]>();
    for (const i of planejados) {
      const k = !i.mesPrevisto ? 'zzzz' : i.mesPrevisto < mesAtual ? mesAtual : i.mesPrevisto;
      m.set(k, [...(m.get(k) || []), i]);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, l]) => [k, l.sort((a, b) => PRIORIDADES[a.prioridade].ordem - PRIORIDADES[b.prioridade].ordem || a.nome.localeCompare(b.nome))] as const);
  }, [planejados, mesAtual]);

  const comprados = itens.filter(i => i.status === 'comprado').sort((a, b) => String(b.compradoEm).localeCompare(String(a.compradoEm)));

  const copiarLista = async (lista: ItemCompra[], titulo: string) => {
    const porForn = new Map<string, ItemCompra[]>();
    for (const i of lista) porForn.set(i.fornecedor || 'Sem fornecedor', [...(porForn.get(i.fornecedor || 'Sem fornecedor') || []), i]);
    const txt = [`*Lista de compras — ${titulo}*`, '',
      ...[...porForn.entries()].flatMap(([f, l]) => [`*${f}*`, ...l.map(i => `• ${i.qtd}× ${i.nome}${i.precoUnit ? ` (~${brl(i.qtd * i.precoUnit)})` : ''}`), '']),
      `Total estimado: ${brl(total(lista))}`].join('\n');
    try { await navigator.clipboard.writeText(txt); setAviso('Lista copiada. É só colar no WhatsApp ou nas notas.'); }
    catch { setAviso('Não deu para copiar automaticamente neste navegador.'); }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#FBF7EE]">
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Compras</h1>
            <p className="text-sm text-slate-500">Planeje insumos, medicamentos e equipamentos. Ao comprar, o lançamento vai para o financeiro.</p>
          </div>
          <button onClick={() => setEditando({ tipo: 'insumo', prioridade: 'importante', qtd: 1, mesPrevisto: mesAtual })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold">
            <Plus className="w-4 h-4" /> Item para comprar
          </button>
        </div>

        {aviso && (
          <div className="flex items-center justify-between gap-2 text-sm text-emerald-800 bg-emerald-50 rounded-xl p-3">
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {aviso}</span>
            <button onClick={() => setAviso('')}><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          <Info titulo="Para comprar este mês" valor={brl(total(doMes))} detalhe={`${doMes.length} ite${doMes.length === 1 ? 'm' : 'ns'}, incluindo os sem data e atrasados`} />
          <Info titulo="Urgentes" valor={brl(total(urgentes))} detalhe={`${urgentes.length} ite${urgentes.length === 1 ? 'm' : 'ns'}`} cor={urgentes.length ? 'text-red-600' : undefined} />
          <div className={`bg-white rounded-3xl border p-5 ${sobraMedia - total(doMes) < 0 ? 'border-red-300' : 'border-teal-600 ring-1 ring-teal-600'}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cabe no mês?</p>
            <p className={`text-2xl font-bold mt-2 ${sobraMedia - total(doMes) < 0 ? 'text-red-600' : 'text-teal-700'}`}>{brl(sobraMedia - total(doMes))}</p>
            <p className="text-xs text-slate-500 mt-1">Sobra média de {brl(sobraMedia)}/mês (lucro operacional dos últimos 3 meses) menos as compras deste mês.</p>
          </div>
        </div>

        {grupos.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-sm text-slate-500">
            <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Nada planejado. Adicione o que precisa comprar ou reponha um insumo da Precificação.
          </div>
        ) : grupos.map(([k, lista]) => (
          <div key={k} className="bg-white rounded-3xl border border-slate-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="font-bold text-slate-800">{k === 'zzzz' ? 'Sem data definida' : k === mesAtual ? `Este mês · ${nomeMes(k)}` : nomeMes(k)}
                <span className="ml-2 text-sm font-semibold text-slate-500">{brl(total(lista))}</span></h2>
              <button onClick={() => copiarLista(lista, k === 'zzzz' ? 'sem data' : nomeMes(k))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700">
                <Copy className="w-3.5 h-3.5" /> Copiar lista
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {lista.map(i => {
                const T = TIPOS[i.tipo];
                const atrasado = i.mesPrevisto && i.mesPrevisto < mesAtual;
                return (
                  <div key={i.id} className="flex items-center gap-3 py-3">
                    <div className={`p-2 rounded-xl ${i.tipo === 'equipamento' ? 'bg-slate-100 text-slate-600' : 'bg-teal-50 text-teal-700'}`}><T.icone className="w-4 h-4" /></div>
                    <button onClick={() => setEditando(i)} className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-slate-800 truncate">{i.qtd}× {i.nome}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {T.rotulo}{i.fornecedor ? ` · ${i.fornecedor}` : ''}{i.precoUnit ? ` · ${brl(i.precoUnit)} cada` : ' · sem preço estimado'}
                        {atrasado ? ` · previsto para ${nomeMes(i.mesPrevisto).toLowerCase()}` : ''}
                      </p>
                    </button>
                    {i.link && <a href={i.link} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-teal-700" title="Abrir link"><ExternalLink className="w-4 h-4" /></a>}
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${PRIORIDADES[i.prioridade].cor}`}>{PRIORIDADES[i.prioridade].rotulo}</span>
                    <span className="w-24 text-right text-sm font-bold text-slate-700">{brl(i.qtd * i.precoUnit)}</span>
                    <button onClick={() => setComprando(i)} className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold">Comprei</button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {insumos.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6">
            <h2 className="font-bold text-slate-800 mb-1">Repor insumos</h2>
            <p className="text-xs text-slate-500 mb-3">Os insumos da Precificação, com o preço da última compra. Clique para colocar na lista.</p>
            <div className="flex flex-wrap gap-2">
              {insumos.filter(ins => !planejados.some(p => p.insumoId === ins.id)).map(ins => (
                <button key={ins.id} onClick={() => setEditando({
                  nome: ins.nome, tipo: 'insumo', qtd: 1, precoUnit: ins.precoEmbalagem, fornecedor: ins.fornecedor,
                  insumoId: ins.id, prioridade: 'importante', mesPrevisto: mesAtual,
                })} className="px-3 py-1.5 rounded-full border border-slate-200 text-xs text-slate-700 hover:border-teal-500 hover:text-teal-700">
                  + {ins.nome} <span className="text-slate-400">· {brl(ins.precoEmbalagem)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {comprados.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6">
            <button onClick={() => setVerComprados(v => !v)} className="font-bold text-slate-800">
              {verComprados ? '▾' : '▸'} Já comprados ({comprados.length})
            </button>
            {verComprados && (
              <div className="divide-y divide-slate-100 mt-3">
                {comprados.map(i => (
                  <div key={i.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    <span className="flex-1 truncate text-slate-700">{i.qtd}× {i.nome}<span className="text-xs text-slate-400"> · {String(i.compradoEm || '').split('-').reverse().join('/')}{i.fornecedor ? ` · ${i.fornecedor}` : ''}</span></span>
                    <span className="font-semibold text-slate-700">{brl(i.valorPago || 0)}</span>
                    <button title="Planejar de novo" onClick={() => setEditando({ ...i, id: undefined, status: 'planejado', compradoEm: undefined, valorPago: undefined, contaPagarId: undefined, precoUnit: i.qtd ? (i.valorPago || 0) / i.qtd : i.precoUnit, mesPrevisto: mesAtual })}
                      className="p-1.5 text-slate-400 hover:text-teal-700"><RotateCcw className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {editando && <ModalItem inicial={editando} insumos={insumos} onFechar={() => setEditando(null)} />}
      {comprando && (
        <ModalComprei item={comprando} categorias={categorias} insumos={insumos} onFechar={() => setComprando(null)}
          onFeito={msg => { setComprando(null); setAviso(msg); }} />
      )}
    </div>
  );
}

function Info({ titulo, valor, detalhe, cor }: { titulo: string; valor: string; detalhe: string; cor?: string }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className={`text-2xl font-bold mt-2 ${cor || 'text-slate-800'}`}>{valor}</p>
      <p className="text-xs text-slate-500 mt-1">{detalhe}</p>
    </div>
  );
}

function ModalItem({ inicial, insumos, onFechar }: { inicial: Partial<ItemCompra>; insumos: Insumo[]; onFechar: () => void }) {
  const [i, setI] = useState<Partial<ItemCompra>>(inicial);
  const [erro, setErro] = useState('');
  const set = (p: Partial<ItemCompra>) => setI(x => ({ ...x, ...p }));
  const ins = i.insumoId ? insumos.find(x => x.id === i.insumoId) : undefined;

  const salvar = async () => {
    if (!i.nome?.trim()) return setErro('Diga o que vai comprar.');
    if (!i.qtd || i.qtd <= 0) return setErro('Informe a quantidade.');
    await saveCompra({ status: 'planejado', ...i, nome: i.nome.trim(), precoUnit: Number(i.precoUnit) || 0 });
    onFechar();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onFechar}>
      <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{inicial.id ? 'Editar item' : 'Item para comprar'}</h3>
          <button onClick={onFechar}><X className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(TIPOS) as TipoCompra[]).map(t => {
            const T = TIPOS[t];
            return (
              <button key={t} onClick={() => set({ tipo: t })}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold border ${i.tipo === t ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-600 border-slate-200'}`}>
                <T.icone className="w-4 h-4" /> {T.rotulo}
              </button>
            );
          })}
        </div>
        <label className="block text-xs font-semibold text-slate-600">O que comprar
          <input value={i.nome || ''} onChange={e => set({ nome: e.target.value })} className={campo + ' mt-1'} placeholder="Ex.: Seringas 3 mL (caixa com 100)" list="lista-insumos" />
          <datalist id="lista-insumos">{insumos.map(x => <option key={x.id} value={x.nome} />)}</datalist>
        </label>
        {ins && <p className="text-xs text-teal-700 -mt-2">Ligado ao insumo da Precificação. Última compra: {brl(ins.precoEmbalagem)} por {ins.qtdEmbalagem} {ins.unidade} ({brl(custoUnitario(ins))}/{ins.unidade}).</p>}
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-slate-600">Quantidade
            <input value={i.qtd ?? ''} onChange={e => set({ qtd: num(e.target.value) })} className={campo + ' mt-1'} inputMode="decimal" />
          </label>
          <label className="text-xs font-semibold text-slate-600">Preço estimado de cada (R$)
            <input value={i.precoUnit != null ? String(i.precoUnit).replace('.', ',') : ''} onChange={e => set({ precoUnit: num(e.target.value) })} className={campo + ' mt-1'} inputMode="decimal" />
          </label>
          <label className="text-xs font-semibold text-slate-600">Prioridade
            <select value={i.prioridade} onChange={e => set({ prioridade: e.target.value as Prioridade })} className={campo + ' mt-1'}>
              {(Object.keys(PRIORIDADES) as Prioridade[]).map(p => <option key={p} value={p}>{PRIORIDADES[p].rotulo}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">Comprar em
            <input type="month" value={i.mesPrevisto || ''} onChange={e => set({ mesPrevisto: e.target.value })} className={campo + ' mt-1'} />
          </label>
          <label className="text-xs font-semibold text-slate-600">Onde comprar
            <input value={i.fornecedor || ''} onChange={e => set({ fornecedor: e.target.value })} className={campo + ' mt-1'} placeholder="Mercado Livre, distribuidora…" />
          </label>
          <label className="text-xs font-semibold text-slate-600">Link (opcional)
            <input value={i.link || ''} onChange={e => set({ link: e.target.value })} className={campo + ' mt-1'} placeholder="https://…" />
          </label>
        </div>
        <label className="block text-xs font-semibold text-slate-600">Observação
          <input value={i.obs || ''} onChange={e => set({ obs: e.target.value })} className={campo + ' mt-1'} />
        </label>
        <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">Total estimado: <strong>{brl((Number(i.qtd) || 0) * (Number(i.precoUnit) || 0))}</strong>
          {i.tipo === 'equipamento' && <span className="block text-xs text-slate-500">Equipamento entra como investimento, fora do lucro operacional do mês.</span>}</p>
        {erro && <p className="text-sm text-red-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {erro}</p>}
        <div className="flex gap-2">
          {inicial.id && (
            <button onClick={async () => { if (window.confirm('Tirar este item da lista?')) { await deleteCompra(inicial.id!); onFechar(); } }}
              className="p-2.5 rounded-xl text-red-600 hover:bg-red-50"><Trash2 className="w-5 h-5" /></button>
          )}
          <button onClick={onFechar} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Cancelar</button>
          <button onClick={salvar} className="flex-1 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-bold">Salvar</button>
        </div>
      </div>
    </div>
  );
}

function ModalComprei({ item, categorias, insumos, onFechar, onFeito }: {
  item: ItemCompra; categorias: CategoriaFinanceira[]; insumos: Insumo[]; onFechar: () => void; onFeito: (msg: string) => void;
}) {
  const [data, setData] = useState(hoje());
  const [valor, setValor] = useState(String(Math.round(item.qtd * item.precoUnit * 100) / 100).replace('.', ','));
  const [fornecedor, setFornecedor] = useState(item.fornecedor || '');
  const [forma, setForma] = useState('Cartão de crédito');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const T = TIPOS[item.tipo];
  const ins = item.insumoId ? insumos.find(x => x.id === item.insumoId) : undefined;

  const confirmar = async () => {
    const v = num(valor);
    if (!v) return setErro('Informe quanto pagou.');
    setSalvando(true);
    try {
      let cat = categorias.find(c => c.tipo === 'despesa' && c.nome === T.categoria);
      const catId = cat?.id || await saveCategoriaFinanceira({ nome: T.categoria, tipo: 'despesa', ...(T.investimento ? { investimento: true } : {}) });
      const contaId = await saveContaPagar({
        descricao: `${item.qtd}× ${item.nome}`, valor: v, vencimento: data, dataVencimento: data,
        status: 'pago', pagoEm: data, categoriaId: catId, categoriaNome: T.categoria, formaPagamento: forma,
        ...(fornecedor.trim() ? { fornecedor: fornecedor.trim() } : {}), ...(T.investimento ? { investimento: true } : {}),
      });
      await saveCompra({ ...item, status: 'comprado', compradoEm: data, valorPago: v, contaPagarId: contaId, fornecedor: fornecedor.trim() || item.fornecedor });
      if (ins && item.qtd > 0) {
        await saveInsumo({ ...ins, precoEmbalagem: Math.round((v / item.qtd) * 100) / 100, fornecedor: fornecedor.trim() || ins.fornecedor, dataCompra: data, origemContaId: contaId });
      }
      onFeito(`Compra lançada no Contas a Pagar (${brl(v)})${ins ? ' e preço do insumo atualizado na Precificação' : ''}.`);
    } catch (e: any) {
      setErro('Não foi possível lançar: ' + (e?.message || 'erro desconhecido'));
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onFechar}>
      <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">Comprei: {item.qtd}× {item.nome}</h3>
          <button onClick={onFechar}><X className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-slate-600">Valor pago (total)
            <input autoFocus value={valor} onChange={e => setValor(e.target.value)} className={campo + ' mt-1 text-lg font-bold'} inputMode="decimal" />
          </label>
          <label className="text-xs font-semibold text-slate-600">Data
            <input type="date" value={data} onChange={e => setData(e.target.value)} className={campo + ' mt-1'} />
          </label>
          <label className="text-xs font-semibold text-slate-600">Onde comprou
            <input value={fornecedor} onChange={e => setFornecedor(e.target.value)} className={campo + ' mt-1'} />
          </label>
          <label className="text-xs font-semibold text-slate-600">Forma de pagamento
            <select value={forma} onChange={e => setForma(e.target.value)} className={campo + ' mt-1'}>
              {['Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Boleto', 'Transferência'].map(f => <option key={f}>{f}</option>)}
            </select>
          </label>
        </div>
        <p className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3">
          Vai para o Contas a Pagar como <strong>{T.categoria}</strong>{T.investimento ? ' (investimento)' : ''}, já pago.
          {ins ? ` O preço de "${ins.nome}" na Precificação passa a ser ${brl(num(valor) / (item.qtd || 1))} por embalagem.` : ''}
        </p>
        {erro && <p className="text-sm text-red-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {erro}</p>}
        <div className="flex gap-2">
          <button onClick={onFechar} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Cancelar</button>
          <button disabled={salvando} onClick={confirmar} className="flex-1 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-bold disabled:opacity-50">
            {salvando ? 'Lançando…' : 'Confirmar compra'}
          </button>
        </div>
      </div>
    </div>
  );
}
