/*
 * Motor de precificação do QUANTUS dentro do ClinicOS.
 * Copyright (c) 2026 Lidiane Helena O. de Almeida — QUANTUS / VetFlow.
 *
 * Mesma lógica do QUANTUS: o preço é calculado "por dentro".
 *   preço sugerido = custos variáveis ÷ (1 − impostos − taxa de cartão − comissão − lucro desejado)
 * A taxa de cartão é a média ponderada pelo jeito que os clientes pagam (mix de pagamento).
 *
 * Diferença para a clínica de verdade: o custo dos insumos vem das compras lançadas
 * no Contas a Pagar, e os custos fixos vêm da média real dos últimos meses.
 */
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getActiveTenantId } from './dataService';

const col = (nome: string, tenantId = getActiveTenantId()) => collection(db!, 'clinicas', tenantId, nome);

// ── Tipos ────────────────────────────────────────────────────────────────

export interface PrecConfig {
  impostosPct: number;            // % sobre o preço (Simples, ISS…)
  mix: { pix: number; debito: number; credito: number; parcelado: number }; // % de cada forma
  taxas: { debito: number; credito: number; parcelado: number };            // % da maquininha
  valorHora: number;              // quanto vale a sua hora de trabalho (R$)
  custoKm: number;                // combustível + desgaste por km rodado (R$)
  lucroPadraoPct: number;         // lucro desejado padrão (%)
  arredondar: number;             // arredonda o preço sugerido para cima (R$ 5, R$ 10…)
  fixosManual?: number | null;    // custo fixo mensal digitado (vazio = usa a média real)
  categoriasFixas: string[];      // categorias do Contas a Pagar que são custo fixo
}

export const CONFIG_PADRAO: PrecConfig = {
  impostosPct: 6,
  mix: { pix: 80, debito: 5, credito: 10, parcelado: 5 },
  taxas: { debito: 1.99, credito: 4.99, parcelado: 9.99 },
  valorHora: 80,
  custoKm: 0.9,
  lucroPadraoPct: 20,
  arredondar: 5,
  fixosManual: null,
  categoriasFixas: ['Marketing', 'Ferramentas digitais', 'Material de escritório'],
};

export interface Insumo {
  id: string;
  nome: string;
  unidade: string;           // un, mL, comprimido, par…
  precoEmbalagem: number;    // quanto pagou na embalagem
  qtdEmbalagem: number;      // quantas unidades vêm na embalagem
  fornecedor?: string;
  origemContaId?: string;    // compra do Contas a Pagar que deu o preço
  dataCompra?: string;
  atualizadoEm?: string;
}

export interface ItemFicha {
  insumoId?: string;
  nome: string;
  qtd: number;
  custoUnit: number;         // guardado como reserva, se o insumo for apagado
}

export interface Ficha {
  id: string;                // = id do serviço
  serviceId: string;
  itens: ItemFicha[];
  minutos: number;           // tempo seu no atendimento (inclui deslocamento)
  km: number;                // km rodados ida e volta
  terceiros: number;         // laboratório, clínica parceira, cremação… (R$)
  comissaoPct: number;       // comissão/repasse sobre o preço (%)
  lucroPct?: number | null;  // vazio = usa o padrão
  atualizadoEm?: string;
}

export interface Resultado {
  insumos: number;
  deslocamento: number;
  maoObra: number;
  terceiros: number;
  custosVar: number;
  cartaoPct: number;         // taxa média de cartão (%)
  deducoesPct: number;       // impostos + cartão + comissão (%)
  lucroPct: number;
  precoSugerido: number;     // arredondado
  precoMinimo: number;       // paga custos e deduções, lucro zero
  // com o preço atual do serviço
  precoAtual: number;
  margem: number;            // R$ que sobra por atendimento
  margemPct: number;
}

// ── Motor ────────────────────────────────────────────────────────────────

export const custoUnitario = (i: Pick<Insumo, 'precoEmbalagem' | 'qtdEmbalagem'>) =>
  i.qtdEmbalagem > 0 ? i.precoEmbalagem / i.qtdEmbalagem : 0;

export const taxaCartaoMedia = (c: PrecConfig) => {
  const total = c.mix.pix + c.mix.debito + c.mix.credito + c.mix.parcelado || 100;
  return (c.mix.debito * c.taxas.debito + c.mix.credito * c.taxas.credito + c.mix.parcelado * c.taxas.parcelado) / total;
};

const arredondaCima = (v: number, passo: number) => (passo > 0 ? Math.ceil(v / passo - 1e-9) * passo : Math.round(v * 100) / 100);

export function calcular(ficha: Partial<Ficha>, config: PrecConfig, insumos: Insumo[], precoAtual = 0): Resultado {
  const porId = new Map(insumos.map(i => [i.id, i]));
  const custoInsumos = (ficha.itens || []).reduce((s, it) => {
    const ins = it.insumoId ? porId.get(it.insumoId) : undefined;
    const unit = ins ? custoUnitario(ins) : it.custoUnit || 0;
    return s + (Number(it.qtd) || 0) * unit;
  }, 0);
  const deslocamento = (Number(ficha.km) || 0) * config.custoKm;
  const maoObra = ((Number(ficha.minutos) || 0) / 60) * config.valorHora;
  const terceiros = Number(ficha.terceiros) || 0;
  const custosVar = custoInsumos + deslocamento + maoObra + terceiros;

  const cartaoPct = taxaCartaoMedia(config);
  const deducoesPct = config.impostosPct + cartaoPct + (Number(ficha.comissaoPct) || 0);
  const lucroPct = ficha.lucroPct ?? config.lucroPadraoPct;

  const divisor = 1 - (deducoesPct + lucroPct) / 100;
  const bruto = divisor > 0 ? custosVar / divisor : 0;
  const divMin = 1 - deducoesPct / 100;
  const precoMinimo = divMin > 0 ? custosVar / divMin : 0;

  const margem = precoAtual > 0 ? precoAtual - custosVar - precoAtual * (deducoesPct / 100) : 0;

  return {
    insumos: custoInsumos, deslocamento, maoObra, terceiros, custosVar,
    cartaoPct, deducoesPct, lucroPct,
    precoSugerido: arredondaCima(bruto, config.arredondar),
    precoMinimo,
    precoAtual,
    margem,
    margemPct: precoAtual > 0 ? margem / precoAtual : 0,
  };
}

// ── Firestore ────────────────────────────────────────────────────────────

const limpar = <T extends object>(o: T) => JSON.parse(JSON.stringify(o)) as T; // tira os undefined

export const subscribePrecConfig = (cb: (c: PrecConfig) => void) => {
  if (!db) { cb(CONFIG_PADRAO); return () => {}; }
  return onSnapshot(doc(col('precificacao_config'), 'geral'),
    s => cb({ ...CONFIG_PADRAO, ...(s.exists() ? (s.data() as Partial<PrecConfig>) : {}) }),
    e => { console.error('precificacao_config:', e.message); cb(CONFIG_PADRAO); });
};
export const savePrecConfig = (c: PrecConfig) => setDoc(doc(col('precificacao_config'), 'geral'), limpar(c));

export const subscribeInsumos = (cb: (l: Insumo[]) => void) => {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(col('precificacao_insumos'),
    s => cb(s.docs.map(d => ({ ...(d.data() as Insumo), id: d.id })).sort((a, b) => a.nome.localeCompare(b.nome))),
    e => { console.error('precificacao_insumos:', e.message); cb([]); });
};
export const saveInsumo = async (i: Partial<Insumo>) => {
  const id = i.id || `ins_${Date.now()}`;
  await setDoc(doc(col('precificacao_insumos'), id), limpar({ ...i, id, atualizadoEm: new Date().toISOString() }));
  return id;
};
export const deleteInsumo = (id: string) => deleteDoc(doc(col('precificacao_insumos'), id));

export const subscribeFichas = (cb: (l: Ficha[]) => void) => {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(col('precificacao_fichas'),
    s => cb(s.docs.map(d => ({ ...(d.data() as Ficha), id: d.id }))),
    e => { console.error('precificacao_fichas:', e.message); cb([]); });
};
export const saveFicha = (f: Ficha) =>
  setDoc(doc(col('precificacao_fichas'), f.serviceId), limpar({ ...f, id: f.serviceId, atualizadoEm: new Date().toISOString() }));

// ── Planejamento de compras ──────────────────────────────────────────────

export type TipoCompra = 'insumo' | 'medicamento' | 'equipamento';
export type Prioridade = 'urgente' | 'importante' | 'quando_der';

export interface ItemCompra {
  id: string;
  nome: string;
  tipo: TipoCompra;
  qtd: number;                 // embalagens/unidades a comprar
  precoUnit: number;           // preço estimado de cada uma
  fornecedor?: string;
  link?: string;
  prioridade: Prioridade;
  mesPrevisto?: string;        // AAAA-MM (vazio = sem data)
  status: 'planejado' | 'comprado' | 'cancelado';
  insumoId?: string;           // ligado a um insumo da Precificação
  obs?: string;
  compradoEm?: string;
  valorPago?: number;
  contaPagarId?: string;
  criadoEm?: string;
}

export const subscribeCompras = (cb: (l: ItemCompra[]) => void) => {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(col('compras_planejadas'),
    s => cb(s.docs.map(d => ({ ...(d.data() as ItemCompra), id: d.id }))),
    e => { console.error('compras_planejadas:', e.message); cb([]); });
};
export const saveCompra = async (i: Partial<ItemCompra>) => {
  const id = i.id || `cmp_${Date.now()}`;
  await setDoc(doc(col('compras_planejadas'), id), limpar({ criadoEm: new Date().toISOString(), ...i, id }), { merge: true });
  return id;
};
export const deleteCompra = (id: string) => deleteDoc(doc(col('compras_planejadas'), id));
