import { useEffect, useMemo, useState } from 'react';
import {
  Calculator, Package, Settings2, Plus, X, Trash2, AlertCircle, CheckCircle2, Search, Sparkles, Target, ShoppingCart,
} from 'lucide-react';
import {
  ClinicService, subscribeServices, saveService,
  ContaPagar, subscribeContasPagar, subscribeContasReceber, ContaReceber, subscribeCategoriasFinanceiras, CategoriaFinanceira,
} from '../../services/dataService';
import {
  PrecConfig, CONFIG_PADRAO, Insumo, Ficha, ItemFicha, Resultado,
  subscribePrecConfig, savePrecConfig, subscribeInsumos, saveInsumo, deleteInsumo, subscribeFichas, saveFicha,
  calcular, custoUnitario, taxaCartaoMedia,
} from '../../services/precificacao';

/**
 * Precificação (motor do QUANTUS) com os dados reais da clínica:
 * - insumos com o preço das compras do Contas a Pagar;
 * - custos fixos pela média real dos últimos meses;
 * - o preço aprovado vai para o cadastro de serviços (agenda, caixa e orçamentos).
 */

const brl = (v: number) => (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const brl0 = (v: number) => (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const pct = (v: number, casas = 0) => `${(Number.isFinite(v) ? v : 0).toFixed(casas).replace('.', ',')}%`;
const num = (v: any) => {
  const s = String(v ?? '').trim().replace(/[^\d,.-]/g, '');
  return Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s) || 0;
};
const campo = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white';

const SERVICOS_BASE: { name: string; category: string; minutos: number; km: number }[] = [
  { name: 'Consulta domiciliar', category: 'Consulta', minutos: 90, km: 20 },
  { name: 'Retorno domiciliar', category: 'Consulta', minutos: 60, km: 20 },
  { name: 'Aplicação de medicação (visita)', category: 'Internação / Procedimento', minutos: 45, km: 20 },
  { name: 'Coleta de exames (visita)', category: 'Exame / Diagnóstico', minutos: 45, km: 20 },
  { name: 'Fluidoterapia subcutânea (visita)', category: 'Internação / Procedimento', minutos: 60, km: 20 },
  { name: 'Curativo (visita)', category: 'Internação / Procedimento', minutos: 45, km: 20 },
];

type Aba = 'servicos' | 'insumos' | 'config';

export default function Precificacao() {
  const [aba, setAba] = useState<Aba>('servicos');
  const [config, setConfig] = useState<PrecConfig>(CONFIG_PADRAO);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [servicos, setServicos] = useState<ClinicService[]>([]);
  const [pagar, setPagar] = useState<ContaPagar[]>([]);
  const [receber, setReceber] = useState<ContaReceber[]>([]);
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [abrirFicha, setAbrirFicha] = useState<ClinicService | null>(null);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    const us = [
      subscribePrecConfig(setConfig), subscribeInsumos(setInsumos), subscribeFichas(setFichas),
      subscribeServices(setServicos), subscribeContasPagar(setPagar), subscribeContasReceber(setReceber),
      subscribeCategoriasFinanceiras(setCategorias),
    ];
    return () => us.forEach(u => u());
  }, []);

  const ativos = servicos.filter(s => s.status !== 'Inactive');
  const fichaDe = useMemo(() => new Map(fichas.map(f => [f.serviceId, f])), [fichas]);

  // Custos fixos: média real dos últimos 3 meses fechados
  const fixosReais = useMemo(() => {
    const d = new Date();
    const meses = [1, 2, 3].map(n => {
      const x = new Date(d.getFullYear(), d.getMonth() - n, 1);
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
    });
    const fixas = new Set(config.categoriasFixas);
    let total = 0;
    for (const c of pagar) {
      if (c.status !== 'pago' || c.investimento || /invest/i.test(c.categoriaNome || '')) continue;
      if (!fixas.has(c.categoriaNome || '')) continue;
      const dt = String(c.pagoEm || c.vencimento || '').slice(0, 7);
      if (meses.includes(dt)) total += Number(c.valor) || 0;
    }
    return { media: total / 3, meses };
  }, [pagar, config.categoriasFixas]);
  const fixosMes = config.fixosManual ?? fixosReais.media;

  // Atendimentos reais no último mês fechado (recebimentos)
  const atendimentosMesPassado = useMemo(() => {
    const m = fixosReais.meses[0];
    return receber.filter(c => c.status === 'recebido' && String(c.recebidoEm || c.vencimento || '').startsWith(m)).length;
  }, [receber, fixosReais.meses]);

  const resultados = useMemo(() => ativos.map(s => {
    const f = fichaDe.get(s.id);
    return { s, f, r: f ? calcular(f, config, insumos, Number(s.price) || 0) : null };
  }), [ativos, fichaDe, config, insumos]);

  const comFicha = resultados.filter(x => x.r && x.r.precoAtual > 0);
  const margemMedia = comFicha.length ? comFicha.reduce((s, x) => s + x.r!.margem, 0) / comFicha.length : 0;
  const atendimentosEquilibrio = margemMedia > 0 ? Math.ceil(fixosMes / margemMedia) : 0;

  const criarServicosBase = async () => {
    const existentes = new Set(servicos.map(s => s.name.toLowerCase()));
    let n = 0;
    for (const b of SERVICOS_BASE) {
      if (existentes.has(b.name.toLowerCase())) continue;
      const id = `srv_${Date.now()}_${n}`;
      await saveService({ id, name: b.name, category: b.category, duration: b.minutos, durationUnit: 'min', price: 0, description: '', status: 'Active', createdAt: new Date().toISOString() });
      await saveFicha({ id, serviceId: id, itens: [], minutos: b.minutos, km: b.km, terceiros: 0, comissaoPct: 0, lucroPct: null });
      n++;
    }
    setAviso(n ? `${n} serviços criados. Abra cada um para montar a ficha técnica.` : 'Esses serviços já existem.');
  };

  return (
    <div className="h-full overflow-y-auto bg-[#FBF7EE]">
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Precificação</h1>
            <p className="text-sm text-slate-500">Motor do QUANTUS com os custos reais da clínica. Os preços são para uso interno.</p>
          </div>
          <div className="flex bg-white rounded-xl border border-slate-200 p-1">
            {([['servicos', 'Serviços', Calculator], ['insumos', 'Insumos', Package], ['config', 'Ajustes', Settings2]] as const).map(([k, r, I]) => (
              <button key={k} onClick={() => setAba(k)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold ${aba === k ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                <I className="w-4 h-4" /> {r}
              </button>
            ))}
          </div>
        </div>

        {aviso && (
          <div className="flex items-center justify-between gap-2 text-sm text-emerald-800 bg-emerald-50 rounded-xl p-3">
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {aviso}</span>
            <button onClick={() => setAviso('')}><X className="w-4 h-4" /></button>
          </div>
        )}

        {aba === 'servicos' && (
          <>
            {/* Equilíbrio */}
            <div className="grid md:grid-cols-3 gap-4">
              <Info titulo="Custos fixos por mês" valor={brl0(fixosMes)}
                detalhe={config.fixosManual != null ? 'Valor digitado em Ajustes' : `Média real de ${config.categoriasFixas.join(', ') || 'nenhuma categoria'} nos últimos 3 meses`} />
              <Info titulo="Sobra média por atendimento" valor={comFicha.length ? brl0(margemMedia) : '—'}
                detalhe={comFicha.length ? `Média de ${comFicha.length} serviço${comFicha.length > 1 ? 's' : ''} com ficha e preço` : 'Monte a ficha e o preço de um serviço'} />
              <div className="bg-white rounded-3xl border border-teal-600 ring-1 ring-teal-600 p-5">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">Ponto de equilíbrio <Target className="w-5 h-5 text-teal-700" /></div>
                <p className="text-2xl font-bold text-teal-700 mt-2">{atendimentosEquilibrio ? `${atendimentosEquilibrio} atendimentos/mês` : '—'}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Para pagar os custos fixos. No mês passado você teve <strong>{atendimentosMesPassado}</strong> recebimento{atendimentosMesPassado === 1 ? '' : 's'}.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="font-bold text-slate-800">Serviços</h2>
                <button onClick={criarServicosBase} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-700">
                  <Sparkles className="w-4 h-4" /> Criar serviços do atendimento domiciliar
                </button>
              </div>
              {ativos.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">Nenhum serviço cadastrado. Use o botão acima ou cadastre em Cadastros → Serviços.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                        <th className="py-2 pr-3">Serviço</th>
                        <th className="py-2 px-3 text-right">Custo</th>
                        <th className="py-2 px-3 text-right">Preço mínimo</th>
                        <th className="py-2 px-3 text-right">Sugerido</th>
                        <th className="py-2 px-3 text-right">Preço atual</th>
                        <th className="py-2 pl-3 text-right">Sobra por atendimento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {resultados.map(({ s, r }) => {
                        const abaixo = r && r.precoAtual > 0 && r.precoAtual < r.precoMinimo;
                        return (
                          <tr key={s.id} onClick={() => setAbrirFicha(s)} className="cursor-pointer hover:bg-slate-50">
                            <td className="py-3 pr-3">
                              <p className="font-semibold text-slate-800">{s.name}</p>
                              <p className="text-xs text-slate-500">{s.category}{!r ? ' · sem ficha técnica' : ''}</p>
                            </td>
                            <td className="py-3 px-3 text-right text-slate-600">{r ? brl(r.custosVar) : '—'}</td>
                            <td className="py-3 px-3 text-right text-slate-600">{r ? brl(r.precoMinimo) : '—'}</td>
                            <td className="py-3 px-3 text-right font-bold text-teal-700">{r ? brl0(r.precoSugerido) : '—'}</td>
                            <td className={`py-3 px-3 text-right font-semibold ${abaixo ? 'text-red-600' : 'text-slate-700'}`}>{s.price ? brl(Number(s.price)) : '—'}</td>
                            <td className="py-3 pl-3 text-right">
                              {r && r.precoAtual > 0 ? (
                                <span className={`font-semibold ${r.margem < 0 ? 'text-red-600' : r.margemPct * 100 < r.lucroPct ? 'text-amber-600' : 'text-teal-700'}`}>
                                  {brl(r.margem)} <span className="text-xs font-normal text-slate-400">({pct(r.margemPct * 100)})</span>
                                </span>
                              ) : <span className="text-slate-400">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="text-xs text-slate-400 mt-3">
                    "Sobra por atendimento" é o que fica depois de insumos, deslocamento, sua hora, terceiros, impostos e taxa de cartão.
                    Vermelho: o preço atual não paga os custos. Laranja: paga, mas abaixo do lucro desejado.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {aba === 'insumos' && <AbaInsumos insumos={insumos} pagar={pagar} />}
        {aba === 'config' && (
          <AbaConfig config={config} categorias={categorias.filter(c => c.tipo === 'despesa')} fixosReais={fixosReais.media} onAviso={setAviso} />
        )}
      </div>

      {abrirFicha && (
        <ModalFicha
          servico={abrirFicha}
          ficha={fichaDe.get(abrirFicha.id)}
          config={config}
          insumos={insumos}
          onFechar={() => setAbrirFicha(null)}
          onAviso={setAviso}
        />
      )}
    </div>
  );
}

function Info({ titulo, valor, detalhe }: { titulo: string; valor: string; detalhe: string }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className="text-2xl font-bold text-slate-800 mt-2">{valor}</p>
      <p className="text-xs text-slate-500 mt-1">{detalhe}</p>
    </div>
  );
}

// ── Ficha técnica do serviço ─────────────────────────────────────────────

function ModalFicha({ servico, ficha, config, insumos, onFechar, onAviso }: {
  servico: ClinicService; ficha?: Ficha; config: PrecConfig; insumos: Insumo[]; onFechar: () => void; onAviso: (s: string) => void;
}) {
  const [f, setF] = useState<Ficha>(ficha || {
    id: servico.id, serviceId: servico.id, itens: [], minutos: Number(servico.duration) || 60, km: 0, terceiros: 0, comissaoPct: 0, lucroPct: null,
  });
  const [busca, setBusca] = useState('');
  const [salvando, setSalvando] = useState(false);
  const r: Resultado = calcular(f, config, insumos, Number(servico.price) || 0);
  const porId = new Map(insumos.map(i => [i.id, i]));

  const sugestoes = busca.trim()
    ? insumos.filter(i => i.nome.toLowerCase().includes(busca.toLowerCase()) && !f.itens.some(it => it.insumoId === i.id)).slice(0, 6)
    : [];

  const set = (p: Partial<Ficha>) => setF(x => ({ ...x, ...p }));
  const setItem = (idx: number, p: Partial<ItemFicha>) => set({ itens: f.itens.map((it, i) => (i === idx ? { ...it, ...p } : it)) });

  const salvar = async (aplicarPreco: boolean) => {
    setSalvando(true);
    try {
      await saveFicha({ ...f, itens: f.itens.map(it => ({ ...it, custoUnit: it.insumoId && porId.get(it.insumoId) ? custoUnitario(porId.get(it.insumoId)!) : it.custoUnit })) });
      if (aplicarPreco) {
        await saveService({ ...servico, price: r.precoSugerido });
        onAviso(`Preço de "${servico.name}" atualizado para ${brl0(r.precoSugerido)}. Ele já vale na agenda e no caixa.`);
      } else onAviso(`Ficha técnica de "${servico.name}" salva.`);
      onFechar();
    } finally { setSalvando(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onFechar}>
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-800">{servico.name}</h3>
            <p className="text-xs text-slate-500">Ficha técnica: o que um atendimento consome</p>
          </div>
          <button onClick={onFechar} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid md:grid-cols-5 gap-6 p-6">
          <div className="md:col-span-3 space-y-5">
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Insumos usados em um atendimento</p>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar insumo cadastrado…" className={campo + ' pl-9'} />
                {sugestoes.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    {sugestoes.map(i => (
                      <button key={i.id} onClick={() => { set({ itens: [...f.itens, { insumoId: i.id, nome: i.nome, qtd: 1, custoUnit: custoUnitario(i) }] }); setBusca(''); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex justify-between">
                        <span>{i.nome}</span><span className="text-slate-500">{brl(custoUnitario(i))}/{i.unidade}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {insumos.length === 0 && <p className="text-xs text-amber-700 mt-2">Cadastre os insumos na aba Insumos (dá para puxar das suas compras).</p>}
              <div className="mt-3 space-y-2">
                {f.itens.map((it, idx) => {
                  const ins = it.insumoId ? porId.get(it.insumoId) : undefined;
                  const unit = ins ? custoUnitario(ins) : it.custoUnit;
                  return (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 min-w-0 truncate">{it.nome}{!ins && it.insumoId ? ' (apagado)' : ''}</span>
                      <input value={String(it.qtd).replace('.', ',')} onChange={e => setItem(idx, { qtd: num(e.target.value) })} className={campo.replace('w-full ', '') + ' w-20 shrink-0 text-right'} inputMode="decimal" />
                      <span className="w-16 shrink-0 text-xs text-slate-500">{ins?.unidade || 'un'}</span>
                      <span className="w-24 shrink-0 text-right text-slate-700">{brl(unit * (Number(it.qtd) || 0))}</span>
                      <button onClick={() => set({ itens: f.itens.filter((_, i) => i !== idx) })} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-slate-600">Seu tempo (minutos, com deslocamento)
                <input value={f.minutos} onChange={e => set({ minutos: num(e.target.value) })} className={campo + ' mt-1'} inputMode="numeric" />
              </label>
              <label className="text-xs font-semibold text-slate-600">Km rodados (ida e volta)
                <input value={f.km} onChange={e => set({ km: num(e.target.value) })} className={campo + ' mt-1'} inputMode="numeric" />
              </label>
              <label className="text-xs font-semibold text-slate-600">Terceiros (laboratório, clínica…) R$
                <input value={String(f.terceiros).replace('.', ',')} onChange={e => set({ terceiros: num(e.target.value) })} className={campo + ' mt-1'} inputMode="decimal" />
              </label>
              <label className="text-xs font-semibold text-slate-600">Comissão / repasse (%)
                <input value={f.comissaoPct} onChange={e => set({ comissaoPct: num(e.target.value) })} className={campo + ' mt-1'} inputMode="decimal" />
              </label>
              <label className="text-xs font-semibold text-slate-600 col-span-2">Lucro desejado (%) — vazio usa o padrão de {config.lucroPadraoPct}%
                <input value={f.lucroPct ?? ''} onChange={e => set({ lucroPct: e.target.value.trim() === '' ? null : num(e.target.value) })} className={campo + ' mt-1'} inputMode="decimal" placeholder={String(config.lucroPadraoPct)} />
              </label>
            </div>
          </div>

          <div className="md:col-span-2 space-y-3">
            <div className="bg-slate-50 rounded-2xl p-4 text-sm space-y-1.5">
              <L r="Insumos" v={brl(r.insumos)} />
              <L r={`Deslocamento (${f.km || 0} km × ${brl(config.custoKm)})`} v={brl(r.deslocamento)} />
              <L r={`Sua hora (${f.minutos || 0} min × ${brl0(config.valorHora)}/h)`} v={brl(r.maoObra)} />
              <L r="Terceiros" v={brl(r.terceiros)} />
              <L r="Custo do atendimento" v={brl(r.custosVar)} forte />
              <L r={`Impostos ${pct(config.impostosPct, 1)} + cartão ${pct(r.cartaoPct, 1)}${f.comissaoPct ? ` + comissão ${pct(f.comissaoPct, 1)}` : ''}`} v={pct(r.deducoesPct, 1)} />
              <L r="Lucro desejado" v={pct(r.lucroPct, 0)} />
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 space-y-1.5 text-sm">
              <L r="Preço mínimo (lucro zero)" v={brl(r.precoMinimo)} />
              <div className="flex justify-between items-baseline pt-1">
                <span className="font-semibold text-slate-700">Preço sugerido</span>
                <span className="text-2xl font-bold text-teal-700">{brl0(r.precoSugerido)}</span>
              </div>
              <L r="Preço atual" v={servico.price ? brl(Number(servico.price)) : '—'} />
              {r.precoAtual > 0 && (
                <p className={`text-xs ${r.margem < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                  Com o preço atual, sobram {brl(r.margem)} por atendimento ({pct(r.margemPct * 100)}).
                </p>
              )}
            </div>
            <button disabled={salvando} onClick={() => salvar(true)} className="w-full py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold disabled:opacity-50">
              Salvar e usar {brl0(r.precoSugerido)} como preço
            </button>
            <button disabled={salvando} onClick={() => salvar(false)} className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">
              Salvar só a ficha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function L({ r, v, forte }: { r: string; v: string; forte?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${forte ? 'border-t border-slate-200 pt-1.5 font-bold text-slate-800' : 'text-slate-600'}`}>
      <span>{r}</span><span className="whitespace-nowrap">{v}</span>
    </div>
  );
}

// ── Insumos ──────────────────────────────────────────────────────────────

function AbaInsumos({ insumos, pagar }: { insumos: Insumo[]; pagar: ContaPagar[] }) {
  const [editando, setEditando] = useState<Partial<Insumo> | null>(null);
  const [verCompras, setVerCompras] = useState(false);
  const usadas = new Set(insumos.map(i => i.origemContaId).filter(Boolean));
  const compras = pagar
    .filter(c => c.status === 'pago' && !c.investimento && /insumo|medicament/i.test(c.categoriaNome || '') && !usadas.has(c.id))
    .sort((a, b) => String(b.pagoEm || b.vencimento).localeCompare(String(a.pagoEm || a.vencimento)));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border border-slate-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-bold text-slate-800">Insumos</h2>
            <p className="text-xs text-slate-500">Preço da embalagem ÷ quantidade = custo de cada unidade usada no atendimento.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setVerCompras(v => !v)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-700">
              <ShoppingCart className="w-4 h-4" /> Puxar das compras ({compras.length})
            </button>
            <button onClick={() => setEditando({ unidade: 'un', qtdEmbalagem: 1 })} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold">
              <Plus className="w-4 h-4" /> Insumo
            </button>
          </div>
        </div>

        {verCompras && (
          <div className="mb-4 bg-slate-50 rounded-2xl p-4">
            <p className="text-xs text-slate-600 mb-2">Compras de medicamentos e insumos do Contas a Pagar. Clique para virar insumo e diga quantas unidades vieram.</p>
            {compras.length === 0 ? <p className="text-sm text-slate-400">Todas as compras já viraram insumo.</p> : (
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-200">
                {compras.map(c => (
                  <button key={c.id} onClick={() => setEditando({
                    nome: c.descricao.replace(/^Medicamentos e insumos — /, ''), precoEmbalagem: Number(c.valor) || 0, qtdEmbalagem: 1, unidade: 'un',
                    fornecedor: c.fornecedor, origemContaId: c.id, dataCompra: String(c.pagoEm || c.vencimento || '').slice(0, 10),
                  })} className="w-full flex justify-between py-2 text-sm hover:bg-white px-2 rounded-lg text-left">
                    <span className="truncate pr-2">{c.descricao}<span className="text-xs text-slate-400"> · {String(c.pagoEm || c.vencimento || '').slice(0, 10).split('-').reverse().join('/')}</span></span>
                    <span className="font-semibold text-slate-700 whitespace-nowrap">{brl(Number(c.valor) || 0)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {insumos.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">Nenhum insumo ainda. Comece puxando das suas compras.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-100">
              <th className="py-2">Insumo</th><th className="py-2 text-right">Embalagem</th><th className="py-2 text-right">Custo por unidade</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {insumos.map(i => (
                <tr key={i.id} onClick={() => setEditando(i)} className="cursor-pointer hover:bg-slate-50">
                  <td className="py-2.5"><p className="font-semibold text-slate-800">{i.nome}</p><p className="text-xs text-slate-500">{[i.fornecedor, i.dataCompra?.split('-').reverse().join('/')].filter(Boolean).join(' · ')}</p></td>
                  <td className="py-2.5 text-right text-slate-600">{brl(i.precoEmbalagem)} / {String(i.qtdEmbalagem).replace('.', ',')} {i.unidade}</td>
                  <td className="py-2.5 text-right font-bold text-slate-800">{brl(custoUnitario(i))}<span className="text-xs font-normal text-slate-500">/{i.unidade}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {editando && <ModalInsumo inicial={editando} onFechar={() => setEditando(null)} />}
    </div>
  );
}

function ModalInsumo({ inicial, onFechar }: { inicial: Partial<Insumo>; onFechar: () => void }) {
  const [i, setI] = useState<Partial<Insumo>>(inicial);
  const [erro, setErro] = useState('');
  const set = (p: Partial<Insumo>) => setI(x => ({ ...x, ...p }));
  const salvar = async () => {
    if (!i.nome?.trim()) return setErro('Dê um nome ao insumo.');
    if (!i.precoEmbalagem || !i.qtdEmbalagem) return setErro('Informe o preço e a quantidade da embalagem.');
    await saveInsumo({ ...i, nome: i.nome.trim() });
    onFechar();
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onFechar}>
      <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{inicial.id ? 'Editar insumo' : 'Novo insumo'}</h3>
          <button onClick={onFechar}><X className="w-5 h-5" /></button>
        </div>
        <label className="block text-xs font-semibold text-slate-600">Nome
          <input value={i.nome || ''} onChange={e => set({ nome: e.target.value })} className={campo + ' mt-1'} placeholder="Ex.: Seringa 3 mL" />
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className="text-xs font-semibold text-slate-600">Preço pago
            <input value={i.precoEmbalagem != null ? String(i.precoEmbalagem).replace('.', ',') : ''} onChange={e => set({ precoEmbalagem: num(e.target.value) })} className={campo + ' mt-1'} inputMode="decimal" />
          </label>
          <label className="text-xs font-semibold text-slate-600">Quantidade
            <input value={i.qtdEmbalagem != null ? String(i.qtdEmbalagem).replace('.', ',') : ''} onChange={e => set({ qtdEmbalagem: num(e.target.value) })} className={campo + ' mt-1'} inputMode="decimal" />
          </label>
          <label className="text-xs font-semibold text-slate-600">Unidade
            <input value={i.unidade || ''} onChange={e => set({ unidade: e.target.value })} className={campo + ' mt-1'} list="unidades" />
            <datalist id="unidades">{['un', 'mL', 'comprimido', 'ampola', 'par', 'g', 'cm'].map(u => <option key={u} value={u} />)}</datalist>
          </label>
        </div>
        <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">
          Custo de cada {i.unidade || 'unidade'}: <strong>{brl(custoUnitario({ precoEmbalagem: i.precoEmbalagem || 0, qtdEmbalagem: i.qtdEmbalagem || 0 }))}</strong>
          <br /><span className="text-xs text-slate-500">Ex.: frasco de 50 mL por R$ 35 → quantidade 50, unidade mL.</span>
        </p>
        {erro && <p className="text-sm text-red-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {erro}</p>}
        <div className="flex gap-2">
          {inicial.id && (
            <button onClick={async () => { if (window.confirm('Apagar este insumo?')) { await deleteInsumo(inicial.id!); onFechar(); } }} className="p-2.5 rounded-xl text-red-600 hover:bg-red-50"><Trash2 className="w-5 h-5" /></button>
          )}
          <button onClick={onFechar} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Cancelar</button>
          <button onClick={salvar} className="flex-1 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-bold">Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ── Ajustes ──────────────────────────────────────────────────────────────

function AbaConfig({ config, categorias, fixosReais, onAviso }: {
  config: PrecConfig; categorias: CategoriaFinanceira[]; fixosReais: number; onAviso: (s: string) => void;
}) {
  const [c, setC] = useState<PrecConfig>(config);
  useEffect(() => setC(config), [config]);
  const somaMix = c.mix.pix + c.mix.debito + c.mix.credito + c.mix.parcelado;
  const n = (v: number) => String(v).replace('.', ',');
  const toggleCat = (nome: string) =>
    setC(x => ({ ...x, categoriasFixas: x.categoriasFixas.includes(nome) ? x.categoriasFixas.filter(n => n !== nome) : [...x.categoriasFixas, nome] }));

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-bold text-slate-800">Seu trabalho e deslocamento</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-slate-600">Valor da sua hora (R$)
            <input value={n(c.valorHora)} onChange={e => setC({ ...c, valorHora: num(e.target.value) })} className={campo + ' mt-1'} inputMode="decimal" />
            <span className="font-normal text-slate-400">Quanto quer tirar por mês ÷ horas trabalhadas.</span>
          </label>
          <label className="text-xs font-semibold text-slate-600">Custo por km (R$)
            <input value={n(c.custoKm)} onChange={e => setC({ ...c, custoKm: num(e.target.value) })} className={campo + ' mt-1'} inputMode="decimal" />
            <span className="font-normal text-slate-400">Combustível ÷ km por litro, mais um pouco de desgaste.</span>
          </label>
          <label className="text-xs font-semibold text-slate-600">Impostos (% do preço)
            <input value={n(c.impostosPct)} onChange={e => setC({ ...c, impostosPct: num(e.target.value) })} className={campo + ' mt-1'} inputMode="decimal" />
          </label>
          <label className="text-xs font-semibold text-slate-600">Lucro desejado padrão (%)
            <input value={n(c.lucroPadraoPct)} onChange={e => setC({ ...c, lucroPadraoPct: num(e.target.value) })} className={campo + ' mt-1'} inputMode="decimal" />
          </label>
          <label className="text-xs font-semibold text-slate-600">Arredondar preço para cima (R$)
            <select value={c.arredondar} onChange={e => setC({ ...c, arredondar: Number(e.target.value) })} className={campo + ' mt-1'}>
              {[0, 1, 5, 10].map(v => <option key={v} value={v}>{v ? `de ${v} em ${v}` : 'não arredondar'}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-bold text-slate-800">Como os clientes pagam</h2>
        <div className="grid grid-cols-4 gap-2">
          {(['pix', 'debito', 'credito', 'parcelado'] as const).map(k => (
            <label key={k} className="text-xs font-semibold text-slate-600">{{ pix: 'Pix/dinheiro', debito: 'Débito', credito: 'Crédito', parcelado: 'Parcelado' }[k]} (%)
              <input value={c.mix[k]} onChange={e => setC({ ...c, mix: { ...c.mix, [k]: num(e.target.value) } })} className={campo + ' mt-1'} inputMode="numeric" />
            </label>
          ))}
        </div>
        {somaMix !== 100 && <p className="text-xs text-amber-700">A soma está em {somaMix}%. O cálculo usa a proporção mesmo assim.</p>}
        <p className="text-xs font-semibold text-slate-600">Taxas da sua maquininha (%)</p>
        <div className="grid grid-cols-3 gap-2">
          {(['debito', 'credito', 'parcelado'] as const).map(k => (
            <label key={k} className="text-xs text-slate-500">{{ debito: 'Débito', credito: 'Crédito à vista', parcelado: 'Parcelado (média)' }[k]}
              <input value={n(c.taxas[k])} onChange={e => setC({ ...c, taxas: { ...c.taxas, [k]: num(e.target.value) } })} className={campo + ' mt-1'} inputMode="decimal" />
            </label>
          ))}
        </div>
        <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">Taxa média de cartão no preço: <strong>{pct(taxaCartaoMedia(c), 2)}</strong></p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 lg:col-span-2">
        <h2 className="font-bold text-slate-800">Custos fixos do mês</h2>
        <p className="text-xs text-slate-500">Marque as categorias do Contas a Pagar que você paga todo mês, com ou sem atendimento. Insumos, combustível e laboratório já entram no custo de cada serviço.</p>
        <div className="flex flex-wrap gap-2">
          {categorias.map(cat => (
            <button key={cat.id} onClick={() => toggleCat(cat.nome)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${c.categoriasFixas.includes(cat.nome) ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-600 border-slate-200'}`}>
              {cat.nome}
            </button>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-3 items-end">
          <p className="text-sm text-slate-600">Média real dos últimos 3 meses (com a seleção salva): <strong>{brl(fixosReais)}</strong></p>
          <label className="text-xs font-semibold text-slate-600">Ou digite um valor fixo por mês (vazio = usar a média)
            <input value={c.fixosManual ?? ''} onChange={e => setC({ ...c, fixosManual: e.target.value.trim() === '' ? null : num(e.target.value) })} className={campo + ' mt-1'} inputMode="decimal" />
          </label>
        </div>
      </div>

      <div className="lg:col-span-2 flex justify-end">
        <button onClick={async () => { await savePrecConfig(c); onAviso('Ajustes salvos. Os preços sugeridos já foram recalculados.'); }}
          className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold">Salvar ajustes</button>
      </div>
    </div>
  );
}
