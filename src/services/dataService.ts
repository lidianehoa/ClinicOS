import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  writeBatch,
  onSnapshot,
  arrayUnion,
  updateDoc,
  query,
  where,
  getDoc,
  getDocs,
  deleteDoc,
  runTransaction,
  deleteField,
  orderBy,
  limit
} from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// PATHS
//   bea_data/{appId}/customers/{id}
//   bea_data/{appId}/daily_flow/{date}       ← entradas do dia
//   bea_data/{appId}/daily_expenses/{date}   ← despesas do dia (novo)
//   bea_data/{appId}/interactions/{id}
// ─────────────────────────────────────────────────────────────────────────────

export const APP_ID = import.meta.env.VITE_APP_TENANT_ID || 'clinicos_demo';

// Helpers para caminhos OPERACIONAIS (artifacts > bea_mvp > public > data > ...)
const OP_COL = (col: string) => collection(db!, 'artifacts', APP_ID, 'public', 'data', col);
const OP_DOC = (col: string, id: string) => doc(db!, 'artifacts', APP_ID, 'public', 'data', col, id);

// Helpers para caminhos de CONFIG/PERFIL (bea_data > bea_mvp > ...)
const CFG_COL = (col: string) => collection(db!, 'bea_data', APP_ID, col);
const CFG_DOC = (col: string, id: string) => doc(db!, 'bea_data', APP_ID, col, id);

const customersCol = () => OP_COL('customers');
const dailyFlowCol = () => OP_COL('daily_flow');
const dailyExpensesCol = () => OP_COL('daily_expenses');

const dailyFlowDoc = (date: string) => OP_DOC('daily_flow', date);
const customerDoc = (id: string) => OP_DOC('customers', id);
const dailyExpensesDoc = (date: string) => OP_DOC('daily_expenses', date);

// Users e Produtos estão no caminho original
const userDoc = (uid: string) => CFG_DOC('users', uid);
const vendaDoc = (id: string) => OP_DOC('vendas', id);
const caixaDoc = (date: string) => CFG_DOC('caixa', date);

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export interface Registro {
  _id: string;
  cliente: string;
  animal: string;
  procedimento: string;
  maquininha: string;
  pagamento: string;
  valor: string;
  observacoes: string;
  pago: boolean;
  isManual: boolean;
  _date?: string;
}

export interface Despesa {
  _id: string;
  descricao: string;
  categoria: string;
  valor: string;
  observacoes: string;
  _date?: string;
}

export interface Animal {
  nome: string;
  especie?: string;
  raca?: string;
  pelagem?: string;
  sexo?: string;
  nascimento?: string;
  esterilizado?: string;
  status?: string;
  microchip?: string;
}

export interface Customer {
  id: string;
  nome: string;
  cpf?: string;
  rg?: string;
  sexo?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  rankingABC?: string;
  ticketMedio?: string;
  ultimaVenda?: string;
  primeiraCompra?: string;
  tags?: string;
  origem?: string;
  codigoSimplesVet?: string;
  animais?: Animal[];
  animal: string;
}

export type CategoriaDespesa = 'Energia' | 'Água' | 'Internet' | 'Aluguel' | 'Salários' | 'Impostos' | 'Fornecedores' | 'Limpeza' | 'Marketing' | 'Manutenção' | 'Outros';
export const CATEGORIAS_DESPESA: CategoriaDespesa[] = ['Energia', 'Água', 'Internet', 'Aluguel', 'Salários', 'Impostos', 'Fornecedores', 'Limpeza', 'Marketing', 'Manutenção', 'Outros'];

export type UserRole = 'administrador' | 'gerente' | 'veterinario' | 'recepcionista' | 'estagiario' | 'auxiliar';

export interface AppUser {
  uid: string;
  email: string;
  nome: string;
  role: UserRole;
  crmv?: string;
  status: 'ativo' | 'inativo';
  photoURL?: string | null;
  staffId?: string;
}

export interface Interaction {
  id: string;
  customerId: string;
  tipo: 'whatsapp' | 'email' | 'telefone' | 'presencial' | 'outro';
  descricao: string;
  data: string;
  operador: string;
  autor?: string;      // Novo (CRM)
  timestamp?: string;  // Novo (CRM)
  texto?: string;      // Novo (CRM)
}

export type LogEntry = Interaction; // Alias para compatibilidade

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const toCustomerId = (name: string): string =>
  name.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 80) || `cliente_${Date.now()}`;

export const toLocalDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// MOVIMENTAÇÃO DIÁRIA (entradas)
// ─────────────────────────────────────────────────────────────────────────────

export const saveDailyFlow = async (date: string, records: Registro[]): Promise<void> => {
  if (!db) { console.warn('Firestore não inicializado'); return; }
  const withDate = records.map(r => ({ ...r, _date: date }));
  await setDoc(
    dailyFlowDoc(date),
    { date, records: withDate, updatedAt: new Date().toISOString() },
    { merge: true }
  );
};

export const subscribeDailyFlow = (
  date: string,
  callback: (records: Registro[]) => void
): (() => void) => {
  if (!db) { callback([]); return () => { }; }
  return onSnapshot(
    dailyFlowDoc(date),
    snap => {
      if (snap.exists()) {
        callback((snap.data().records as Registro[]) ?? []);
      } else {
        callback([]);
      }
    },
    err => { console.error('subscribeDailyFlow:', err.code, err.message); callback([]); }
  );
};

export const subscribeAllDailyFlows = (
  callback: (records: Registro[]) => void
): (() => void) => {
  if (!db) { callback([]); return () => {}; }
  try {
    return onSnapshot(
      dailyFlowCol(),
      (snap) => {
        const allRecords: Registro[] = snap.docs.flatMap(
          d => (d.data().records as Registro[]) ?? []
        );
        callback(allRecords);
      },
      (err) => { 
        console.error('ERRO subscribeAllDailyFlows:', err.code, err.message); 
        callback([]); 
      }
    );
  } catch (err) {
    console.error("Exceção subscribeAllDailyFlows:", err);
    callback([]);
    return () => {};
  }
};

/** Listener para todos os clientes. */
export const subscribeCustomers = (
  callback: (customers: Customer[]) => void
): (() => void) => {
  if (!db) { callback([]); return () => { }; }
  return onSnapshot(
    customersCol(),
    snap => {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as Customer));
      list.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      callback(list);
    },
    err => { console.error('subscribeCustomers:', err.code, err.message); callback([]); }
  );
};

/** Busca um cliente por ID. */
export const getCustomer = async (id: string): Promise<Customer | null> => {
  if (!db) return null;
  const snap = await getDoc(customerDoc(id));
  return snap.exists() ? (snap.data() as Customer) : null;
};

/** Busca clientes por texto (client-side search). */
export const searchCustomers = async (text: string): Promise<Customer[]> => {
  if (!db) return [];
  const snap = await getDocs(customersCol());
  const all = snap.docs.map(d => ({ ...d.data(), id: d.id } as Customer));
  const query = text.toLowerCase();
  return all.filter(c => 
    c.nome.toLowerCase().includes(query) || 
    (c.cpf && c.cpf.includes(query)) ||
    (c.email && c.email.toLowerCase().includes(query))
  ).slice(0, 20);
};

// ─────────────────────────────────────────────────────────────────────────────
// INTERAÇÕES / HISTÓRICO
// ─────────────────────────────────────────────────────────────────────────────

export const addInteraction = async (
  customerId: string, 
  data: { texto: string; autor: string }
): Promise<void> => {
  if (!db) return;
  const id = `int_${Date.now()}`;
  const interaction: Interaction = {
    id,
    customerId,
    tipo: 'outro',
    descricao: data.texto,
    data: new Date().toISOString(),
    operador: data.autor,
    autor: data.autor,
    texto: data.texto,
    timestamp: new Date().toISOString()
  };
  await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'interactions', id), interaction);
};

export const subscribeInteractions = (
  customerId: string,
  callback: (interactions: Interaction[]) => void
): (() => void) => {
  if (!db) { callback([]); return () => {}; }
  const q = query(
    collection(db, 'artifacts', APP_ID, 'public', 'data', 'interactions'),
    where('customerId', '==', customerId)
  );
  return onSnapshot(q, snap => {
    const list = snap.docs.map(d => d.data() as Interaction);
    list.sort((a, b) => (b.timestamp || b.data).localeCompare(a.timestamp || a.data));
    callback(list);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// DESPESAS DIÁRIAS (saídas)
// ─────────────────────────────────────────────────────────────────────────────

export const saveDespesas = async (date: string, despesas: Despesa[]): Promise<void> => {
  if (!db) { console.warn('Firestore não inicializado'); return; }
  const withDate = despesas.map(d => ({ ...d, _date: date }));
  await setDoc(
    dailyExpensesDoc(date),
    { date, despesas: withDate, updatedAt: new Date().toISOString() },
    { merge: true }
  );
};

export const subscribeDespesas = (
  date: string,
  callback: (despesas: Despesa[]) => void
): (() => void) => {
  if (!db) { callback([]); return () => { }; }
  return onSnapshot(
    dailyExpensesDoc(date),
    snap => callback(snap.exists() ? ((snap.data().despesas as Despesa[]) ?? []) : []),
    err => { console.error('subscribeDailyExpenses:', err.code, err.message); callback([]); }
  );
};

export const subscribeAllDespesas = (
  callback: (despesas: Despesa[]) => void
): (() => void) => {
  if (!db) { callback([]); return () => {}; }
  return onSnapshot(
    dailyExpensesCol(),
    snap => {
      const all: Despesa[] = snap.docs.flatMap(
        d => (d.data().despesas as Despesa[]) ?? []
      );
      callback(all);
    },
    err => { console.error('subscribeAllDespesas:', err.code, err.message); callback([]); }
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CRM & CLIENTES
// ─────────────────────────────────────────────────────────────────────────────

export const saveCustomer = async (customer: Customer): Promise<void> => {
  if (!db) return;
  const safeId = customer.id || toCustomerId(customer.nome);
  await setDoc(customerDoc(safeId), { ...customer, id: safeId }, { merge: true });
};

export const deleteCustomer = async (_id: string): Promise<void> => {
  if (!db) return;
  // Implementação futura de delete real no Firestore se necessário
};

/** Importa clientes em lote. */
export const batchSaveCustomers = async (customers: Customer[]): Promise<void> => {
  if (!db || customers.length === 0) return;
  const CHUNK = 499;
  for (let i = 0; i < customers.length; i += CHUNK) {
    const batch = writeBatch(db);
    for (const c of customers.slice(i, i + CHUNK)) {
      const safeId = c.id ? toCustomerId(c.id) : toCustomerId(c.nome);
      batch.set(customerDoc(safeId), { ...c, id: safeId }, { merge: true });
    }
    await batch.commit();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PRODUTOS & ESTOQUE (LEGACY / OLD)
// ─────────────────────────────────────────────────────────────────────────────

export interface Produto {
  id: string;
  nome: string;
  codigo: string;
  tipo: 'Produto' | 'Serviço' | 'Pacote';
  grupo: string;
  marca: string | null;
  unidade: string;
  proposito: string | null;
  controlaEstoque: boolean;
  custo: number | null;
  venda: number | null;
  estoque: number | null;
  codigoBarra: string | null;
  situacao: 'ativo' | 'inativo';
}

export const batchSaveProdutos = async (produtos: Produto[]): Promise<void> => {
  if (!db || produtos.length === 0) return;
  const CHUNK = 499;
  for (let i = 0; i < produtos.length; i += CHUNK) {
    const batch = writeBatch(db);
    for (const p of produtos.slice(i, i + CHUNK)) {
      batch.set(doc(collection(db, 'bea_data', APP_ID, 'produtos'), p.id), p, { merge: true });
    }
    await batch.commit();
  }
};

export const subscribeProdutos = (
  callback: (produtos: Produto[]) => void
): (() => void) => {
  if (!db) { callback([]); return () => { }; }
  return onSnapshot(
    collection(db, 'bea_data', APP_ID, 'produtos'),
    snap => {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as Produto));
      list.sort((a, b) => a.nome.localeCompare(b.nome));
      callback(list);
    },
    err => { console.error('subscribeProdutos:', err.code, err.message); callback([]); }
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS & STOCK (NEW)
// ─────────────────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  internalCode: string;
  name: string;
  brand?: string;
  type: 'product' | 'service';
  group: string;
  unit: string;
  purpose?: string;
  barcode?: string;
  ncmCode?: string;
  anvisaCode?: string;
  costPrice: number;
  salePrice: number;
  commission?: number;
  controlsStock: boolean;
  currentStock?: number;
  minStock?: number;
  maxStock?: number;
  expiryDate?: string;
  supplier?: string;
  lastPurchaseDate?: string;
  taxProfile?: string;
  acquisitionForm?: string;
  taxSituation?: string;
  aliquot?: string;
  csticms?: string;
  merchandiseOrigin?: string;
  cest?: string;
  status: 'active' | 'inactive';
  tenantId: string;
  createdAt?: string | any;
  updatedAt?: string | any;
}

export const configDoc = (tenantId: string = APP_ID) => doc(db!, 'artifacts', tenantId, 'public', 'data', 'config', 'integrations');
export const servicesCol = (tenantId: string = APP_ID) => collection(db!, 'artifacts', tenantId, 'public', 'data', 'services');
export const productsCol = (tenantId: string = APP_ID) => collection(db!, 'artifacts', tenantId, 'public', 'data', 'products');
export const productDoc = (id: string, tenantId: string = APP_ID) => doc(productsCol(tenantId), id);

export const subscribeProducts = (
  callback: (products: Product[]) => void
): (() => void) => {
  if (!db) { callback([]); return () => { }; }
  return onSnapshot(
    productsCol(),
    snap => {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as Product));
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      callback(list);
    },
    err => { console.error('subscribeProducts:', err.code, err.message); callback([]); }
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CAIXA OPERACIONAL
// ─────────────────────────────────────────────────────────────────────────────

export type CaixaStatus = 'aberto' | 'fechado';
export type MovimentoTipo = 'entrada' | 'saida' | 'sangria' | 'suprimento';

export interface MovimentoCaixa {
  _id: string;
  tipo: MovimentoTipo;
  valor: string;
  descricao: string;
  operador: string;
  criadoEm: string;
}

export interface FechamentoCaixa {
  valorContado: string;
  observacoes: string;
  fechadoEm: string;
  operador: string;
}

export interface CaixaDia {
  date: string;
  status: CaixaStatus;
  saldoInicial: string;
  operador: string;
  aberturaAt: string;
  movimentos: MovimentoCaixa[];
  fechamento?: FechamentoCaixa;
}

export const abrirCaixa = async (date: string, saldoInicial: string, operador: string): Promise<void> => {
  if (!db) return;
  await setDoc(caixaDoc(date), {
    date,
    status: 'aberto',
    saldoInicial,
    operador,
    aberturaAt: new Date().toISOString(),
    movimentos: []
  });
};

export const addMovimentoCaixa = async (date: string, mov: Omit<MovimentoCaixa, '_id' | 'criadoEm'>, customId?: string): Promise<void> => {
  if (!db) return;
  const _id = customId || `mov_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const novoMov: MovimentoCaixa = {
    ...mov,
    _id,
    criadoEm: new Date().toISOString()
  };
  await updateDoc(caixaDoc(date), { movimentos: arrayUnion(novoMov) });
};

export const fecharCaixa = async (date: string, valorContado: string, observacoes: string, operador: string): Promise<void> => {
  if (!db) return;
  const fechamento: FechamentoCaixa = {
    valorContado,
    observacoes,
    fechadoEm: new Date().toISOString(),
    operador,
  };
  await updateDoc(caixaDoc(date), { status: 'fechado', fechamento });
};

export const reabrirCaixa = async (date: string): Promise<void> => {
  if (!db) return;
  await updateDoc(caixaDoc(date), {
    status: 'aberto',
    fechamento: deleteField()
  });
};

export const subscribeCaixa = (date: string, callback: (caixa: CaixaDia | null) => void): (() => void) => {
  if (!db) { callback(null); return () => { }; }
  return onSnapshot(
    caixaDoc(date),
    snap => callback(snap.exists() ? (snap.data() as CaixaDia) : null),
    err => { console.error('subscribeCaixa:', err.code, err.message); callback(null); }
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// VENDAS (PDV)
// ─────────────────────────────────────────────────────────────────────────────

export interface VendaItem extends Produto {
  quantidade: number;
}

export interface Venda {
  id: string;
  data: string;
  itens: VendaItem[];
  total: number;
  metodoPagamento: string;
  maquininha: string;
  operador: string;
  status: 'concluida' | 'cancelada';
  criadoEm: string;
}

export const registrarVenda = async (
  date: string,
  itens: VendaItem[],
  total: number,
  operador: string,
  metodoPagamento: string,
  clienteInfo?: { nome: string; animal: string },
  maquininha: string = 'N/A'
): Promise<{ vendaId: string }> => {
  if (!db) throw new Error('Firestore não inicializado');
  const vendaId = `venda_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const novaVenda: Venda = {
    id: vendaId,
    data: date,
    itens,
    total,
    metodoPagamento,
    maquininha,
    operador,
    status: 'concluida',
    criadoEm: new Date().toISOString(),
  };

  // 1. Salvar venda
  await setDoc(vendaDoc(vendaId), novaVenda);

  // 2. Registrar no movimento do caixa (financeiro puro) - USANDO O MESMO ID DA VENDA
  await addMovimentoCaixa(date, {
    tipo: 'entrada',
    valor: total.toString(),
    descricao: `Venda PDV - ${metodoPagamento}${maquininha !== 'N/A' ? ` (${maquininha})` : ''}${clienteInfo ? ` - ${clienteInfo.nome}` : ''}`,
    operador
  }, vendaId);

  // 3. SINCRONIZAR COM MONITORAMENTO (Planilha de atendimentos) VIA TRANSAÇÃO
  const reg: Registro = {
    _id: vendaId,
    cliente: clienteInfo?.nome || 'Cliente PDV',
    animal: clienteInfo?.animal || 'N/A',
    procedimento: itens.map(i => i.nome).join(', ').slice(0, 50),
    maquininha: maquininha,
    pagamento: metodoPagamento,
    valor: total.toString(),
    observacoes: `Origem: PDV (${vendaId})`,
    pago: true,
    isManual: false,
    _date: date
  };

  const flowDocRef = dailyFlowDoc(date);
  
  await runTransaction(db, async (transaction) => {
    const flowSnap = await transaction.get(flowDocRef);
    let records: Registro[] = [];
    
    if (flowSnap.exists()) {
      const data = flowSnap.data();
      records = Array.isArray(data.records) ? data.records : [];
    }
    
    // Adiciona o novo registro (evitando duplicados por ID)
    const updatedRecords = [...records.filter(r => r._id !== vendaId), reg];
    
    transaction.set(
      flowDocRef,
      { date, records: updatedRecords, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  });

  return { vendaId };
};

/** Exclui uma venda e remove seus rastros no caixa e monitoramento */
export const deleteVenda = async (date: string, vendaId: string): Promise<void> => {
  if (!db) return;
  
  try {
    // 1. Remover do Monitoramento
    const flowDocRef = dailyFlowDoc(date);
    const flowSnap = await getDoc(flowDocRef);
    if (flowSnap.exists()) {
      const records = (flowSnap.data().records as Registro[]).filter(r => r._id !== vendaId);
      await updateDoc(flowDocRef, { records });
    }

    // 2. Remover do Movimento do Caixa
    const caixaDocRef = caixaDoc(date);
    const caixaSnap = await getDoc(caixaDocRef);
    if (caixaSnap.exists()) {
      const movimentos = (caixaSnap.data().movimentos as MovimentoCaixa[]).filter(m => m._id !== vendaId);
      await updateDoc(caixaDocRef, { movimentos });
    }

    // 3. Excluir documento da venda
    const vDoc = vendaDoc(vendaId);
    const vSnap = await getDoc(vDoc);
    if (vSnap.exists()) {
      await deleteDoc(vDoc);
    }
  } catch (err) {
    console.warn('Alguns documentos podem não existir mais, continuando limpeza...', err);
  }
};

/** LIMPEZA TOTAL (ADMIN): Apaga todos os registros de um dia específico */
export const limparDadosDoDia = async (date: string): Promise<void> => {
  if (!db) return;
  if (!confirm(`ATENÇÃO: Isso apagará TODOS os registros (Caixa, Vendas, Monitoramento) do dia ${date.split('-').reverse().join('/')}. Continuar?`)) return;

  try {
    const batch = writeBatch(db);
    
    // 1. Apaga Caixa
    batch.delete(caixaDoc(date));
    
    // 2. Apaga Monitoramento (Daily Flow)
    batch.delete(dailyFlowDoc(date));
    
    // 3. Apaga Despesas
    batch.delete(dailyExpensesDoc(date));

    await batch.commit();
    alert('Dados do dia removidos com sucesso.');
  } catch (err) {
    console.error('Erro ao limpar dados do dia:', err);
    throw err;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÕES FISCAIS (NFe)
// ─────────────────────────────────────────────────────────────────────────────

export interface FiscalConfig {
  cnpj: string;
  razaoSocial: string;
  inscricaoEstadual: string;
  ambiente: 'homologacao' | 'producao';
  focusTokenHomologacao: string;
  focusTokenProducao: string;
}

export const saveFiscalConfig = async (data: FiscalConfig): Promise<void> => {
  if (!db) return;
  await setDoc(CFG_DOC('config', 'fiscal'), data, { merge: true });
};

export const getFiscalConfig = async (): Promise<FiscalConfig | null> => {
  if (!db) return null;
  const snap = await getDoc(CFG_DOC('config', 'fiscal'));
  return snap.exists() ? (snap.data() as FiscalConfig) : null;
};

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÕES INTEGRAÇÕES
// ─────────────────────────────────────────────────────────────────────────────

export interface IntegrationsConfig {
  geminiApiKey?: string;
  anthropicApiKey?: string;
  evolutionApiUrl?: string;
  evolutionApiKey?: string;
  evolutionInstanceName?: string;
  whatsappEnabled?: boolean;
}

export const saveIntegrationsConfig = async (data: IntegrationsConfig): Promise<void> => {
  if (!db) return;
  await setDoc(CFG_DOC('config', 'integrations'), data, { merge: true });
};

export const getIntegrationsConfig = async (): Promise<IntegrationsConfig | null> => {
  if (!db) return null;
  const snap = await getDoc(CFG_DOC('config', 'integrations'));
  return snap.exists() ? (snap.data() as IntegrationsConfig) : null;
};

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÕES DA CLÍNICA
// ─────────────────────────────────────────────────────────────────────────────

export interface ClinicConfig {
  name: string;
  cnpj: string;
  phone: string;
  email: string;
  website: string;
  address: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
  businessHours: {
    open: string;
    close: string;
    days: Record<string, boolean>;
  };
  logoUrl?: string;
}

export const saveClinicConfig = async (data: ClinicConfig): Promise<void> => {
  if (!db) return;
  await setDoc(CFG_DOC('config', 'clinic'), data, { merge: true });
};

export const getClinicConfig = async (): Promise<ClinicConfig | null> => {
  if (!db) return null;
  const snap = await getDoc(CFG_DOC('config', 'clinic'));
  return snap.exists() ? (snap.data() as ClinicConfig) : null;
};

// ─────────────────────────────────────────────────────────────────────────────
// SERVIÇOS E PREÇOS
// ─────────────────────────────────────────────────────────────────────────────

export interface ClinicService {
  id: string;
  name: string;
  category: string;
  duration: number;
  durationUnit: 'min' | 'h';
  price: number;
  description: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export const saveService = async (service: ClinicService): Promise<void> => {
  if (!db) return;
  const safeId = service.id || `srv_${Date.now()}`;
  await setDoc(CFG_DOC('services', safeId), { ...service, id: safeId }, { merge: true });
};

export const deleteService = async (id: string): Promise<void> => {
  if (!db) return;
  await updateDoc(CFG_DOC('services', id), { status: 'Inactive' });
};

export const subscribeServices = (callback: (services: ClinicService[]) => void): (() => void) => {
  if (!db) { callback([]); return () => {}; }
  return onSnapshot(
    CFG_COL('services'),
    snap => {
      const list = snap.docs.map(d => d.data() as ClinicService);
      list.sort((a, b) => a.name.localeCompare(b.name));
      callback(list);
    },
    err => { console.error('subscribeServices:', err.code, err.message); callback([]); }
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSÁVEIS (STAFF)
// ─────────────────────────────────────────────────────────────────────────────

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  professionalId: string;
  email: string;
  accessLevel: 'Professional' | 'Receptionist' | 'Manager' | 'Admin';
  phone: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export const saveStaff = async (staff: StaffMember): Promise<void> => {
  if (!db) return;
  const safeId = staff.id || `staff_${Date.now()}`;
  await setDoc(CFG_DOC('staff', safeId), { ...staff, id: safeId }, { merge: true });
};

export const deleteStaff = async (id: string): Promise<void> => {
  if (!db) return;
  await updateDoc(CFG_DOC('staff', id), { status: 'Inactive' });
};

export const getStaffByEmail = async (email: string): Promise<StaffMember | null> => {
  if (!db) return null;
  const q = query(CFG_COL('staff'), where('email', '==', email.trim()), where('status', '==', 'Active'));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as StaffMember;
};

export const subscribeStaff = (callback: (staff: StaffMember[]) => void): (() => void) => {
  if (!db) { callback([]); return () => {}; }
  return onSnapshot(
    CFG_COL('staff'),
    snap => {
      const list = snap.docs.map(d => d.data() as StaffMember);
      list.sort((a, b) => a.name.localeCompare(b.name));
      callback(list);
    },
    err => { console.error('subscribeStaff:', err.code, err.message); callback([]); }
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AGENDAMENTOS
// ─────────────────────────────────────────────────────────────────────────────

export interface Appointment {
  id: string;
  date: string;               // formato ISO: "2026-06-27"
  startTime: string;          // formato "HH:MM": "09:00"
  endTime: string;            // calculado
  clientId: string;           
  clientName: string;         
  patientId: string;          
  patientName: string;        
  serviceId: string;          
  serviceName: string;        
  professionalId?: string;    
  professionalName?: string;  
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;             
  createdAt: string;
  updatedAt: string;
}

export const saveAppointment = async (appt: Appointment): Promise<void> => {
  if (!db) return;
  const safeId = appt.id || `apt_${Date.now()}`;
  await setDoc(CFG_DOC('appointments', safeId), { ...appt, id: safeId, updatedAt: new Date().toISOString() }, { merge: true });
};

export const subscribeAppointments = (callback: (appointments: Appointment[]) => void): (() => void) => {
  if (!db) { callback([]); return () => {}; }
  return onSnapshot(
    CFG_COL('appointments'),
    snap => {
      const list = snap.docs.map(d => d.data() as Appointment);
      callback(list);
    },
    err => { console.error('subscribeAppointments:', err.code, err.message); callback([]); }
  );
};

export const getAppointments = async (): Promise<Appointment[]> => {
  if (!db) return [];
  const snap = await getDocs(CFG_COL('appointments'));
  return snap.docs.map(d => d.data() as Appointment);
};

export const addPatientToDailyFlow = async (date: string, registro: Registro): Promise<void> => {
  if (!db) return;
  const docRef = dailyFlowDoc(date);
  const snap = await getDoc(docRef);
  let records: Registro[] = [];
  if (snap.exists()) {
    records = snap.data().records || [];
  }
  records.push({ ...registro, _date: date });
  await setDoc(docRef, { date, records, updatedAt: new Date().toISOString() }, { merge: true });
};

// ─────────────────────────────────────────────────────────────────────────────
// PERFIL DE USUÁRIO
// ─────────────────────────────────────────────────────────────────────────────

export const saveUserProfile = async (profile: AppUser): Promise<void> => {
  if (!db) return;
  await setDoc(userDoc(profile.uid), profile, { merge: true });
};

export const subscribeUserProfile = (uid: string, callback: (user: AppUser | null) => void): (() => void) => {
  if (!db) { callback(null); return () => { }; }
  return onSnapshot(
    userDoc(uid),
    snap => callback(snap.exists() ? (snap.data() as AppUser) : null),
    err => { console.error('getUserProfile:', err); callback(null); }
  );
};

export const canDelete = (role: UserRole | undefined): boolean => {
  return role === 'gerente' || role === 'administrador';
}

// ─────────────────────────────────────────────────────────────────────────────
// PRONTUÁRIOS (MEDICAL RECORDS)
// ─────────────────────────────────────────────────────────────────────────────
export interface MedicalRecord {
  id: string;
  patientId: string;          // referência ao paciente em /patients (ou nome)
  patientName: string;        // desnormalizado
  clientId: string;           // referência ao cliente/tutor
  clientName: string;         // desnormalizado
  appointmentId?: string;     // referência ao agendamento (opcional)
  professionalId?: string;    // quem criou o prontuário
  professionalName?: string;
  date: string;               // data do atendimento "YYYY-MM-DD"
  time: string;               // hora "HH:MM"

  // Anamnese
  chiefComplaint: string;     // queixa principal (obrigatório)
  anamnesis: string;          // histórico/anamnese completa
  currentMedications?: string; // medicamentos em uso

  // Exame Físico
  physicalExam?: {
    weight?: number;          // peso em kg
    temperature?: number;     // temperatura em °C
    heartRate?: number;       // freq. cardíaca bpm
    respiratoryRate?: number; // freq. respiratória rpm
    observations?: string;    // demais observações
  };

  // Diagnóstico e Conduta
  diagnosis: string;          // diagnóstico (obrigatório)
  treatment: string;          // tratamento prescrito
  prescription?: string;      // receituário detalhado
  returnDate?: string;        // data de retorno sugerida "YYYY-MM-DD"
  evolution?: string;         // evolução/observações finais

  // Anexos
  attachments?: {
    name: string;
    url: string;
    type: 'exam' | 'image' | 'document';
  }[];

  createdAt: string;
  updatedAt: string;
}

export const saveMedicalRecord = async (record: MedicalRecord): Promise<void> => {
  if (!db) return;
  const colRef = collection(db, 'records');
  await setDoc(doc(colRef, record.id), record, { merge: true });
};

export const subscribeMedicalRecords = (
  clientId: string,
  callback: (records: MedicalRecord[]) => void
) => {
  if (!db) return () => {};
  const colRef = collection(db, 'records');
  const q = query(colRef, where('clientId', '==', clientId));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => doc.data() as MedicalRecord);
    data.sort((a, b) => {
      const da = a.date + a.time;
      const db = b.date + b.time;
      return db.localeCompare(da);
    });
    callback(data);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION LOGS (WHATSAPP)
// ─────────────────────────────────────────────────────────────────────────────
export interface NotificationLog {
  id: string;
  type: 'reminder' | 'confirmation' | 'return_reminder';
  appointmentId?: string;
  clientName: string;
  phone: string;
  message: string;
  status: 'sent' | 'failed';
  sentAt: string;
}

export const saveNotificationLog = async (log: NotificationLog): Promise<void> => {
  if (!db) return;
  const colRef = collection(db, 'notifications_log');
  await setDoc(doc(colRef, log.id), log, { merge: true });
};

export const subscribeNotificationLogs = (
  callback: (logs: NotificationLog[]) => void
) => {
  if (!db) return () => {};
  const colRef = collection(db, 'notifications_log');
  const q = query(colRef, orderBy('sentAt', 'desc'), limit(50));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((doc) => doc.data() as NotificationLog));
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// MEDICAL PORTAL & CONSULTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface PrescriptionItem {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface SupplyUsed {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

export interface Consultation {
  id: string;
  patientId: string;
  patientName: string;
  clientId: string;
  clientName: string;
  appointmentId?: string;
  professionalId: string;
  professionalName: string;

  date: string;
  time: string;
  consultationType: string;

  weight?: number;
  temperature?: number;
  heartRate?: number;
  respiratoryRate?: number;
  tpc?: number;
  mucosas?: string;
  hydration?: string;
  bloodPressure?: string;

  chiefComplaint?: string;
  anamnesis?: string;
  physicalExam?: string;
  diagnosis?: string;
  treatment?: string;
  observations?: string;
  returnDate?: string;

  prescription: PrescriptionItem[];
  suppliesUsed: SupplyUsed[];

  status: 'draft' | 'open' | 'completed';
  tenantId: string;
  createdAt: string | any;
  updatedAt: string | any;
}

export interface StockAlert {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  alertType: 'below_minimum' | 'out_of_stock';
  resolvedAt?: string | any;
  createdAt: string | any;
}

export interface TimelineEvent {
  id: string;
  date: string;
  time?: string;
  type: 'consultation' | 'hospitalization' | 'surgery' | 'vaccine' | 'exam' | 'document' | 'weight' | 'note';
  title: string;
  subtitle?: string;
  professional?: string;
  status?: 'completed' | 'pending' | 'expired';
  referenceId: string;
  referenceCollection: string;
}

export const consultationsCol = (tenantId: string = APP_ID) => collection(db!, 'artifacts', tenantId, 'public', 'data', 'consultations');
export const stockAlertsCol = (tenantId: string = APP_ID) => collection(db!, 'artifacts', tenantId, 'public', 'data', 'stock_alerts');
export const hospitalizationsCol = (tenantId: string = APP_ID) => collection(db!, 'artifacts', tenantId, 'public', 'data', 'hospitalizations');
export const surgeriesCol = (tenantId: string = APP_ID) => collection(db!, 'artifacts', tenantId, 'public', 'data', 'surgeries');
export const recordsCol = (tenantId: string = APP_ID) => collection(db!, 'artifacts', tenantId, 'public', 'data', 'records');
export const prescriptionsCol = (tenantId: string = APP_ID) => collection(db!, 'artifacts', tenantId, 'public', 'data', 'prescriptions');
export const scheduledDosesCol = (tenantId: string = APP_ID) => collection(db!, 'artifacts', tenantId, 'public', 'data', 'scheduled_doses');
export const hospitalizationEvolutionsCol = (tenantId: string = APP_ID) => collection(db!, 'artifacts', tenantId, 'public', 'data', 'hospitalization_evolutions');

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAÇÃO (HOSPITALIZATION)
// ─────────────────────────────────────────────────────────────────────────────

export interface Hospitalization {
  id: string;
  patientId: string;
  patientName: string;
  species: string;
  breed?: string;
  sex?: string;
  weight?: number;
  clientId: string;
  clientName: string;
  professionalId?: string;
  professionalName?: string;

  admissionDate: string | any; // Timestamp / ISO string
  expectedDischarge?: string | any;
  dischargeDate?: string | any;
  sector: 'hospitalized' | 'isolation' | 'quarantine' | 'triage';
  box?: string;
  urgencyLevel: 'emergency' | 'urgent' | 'little_urgent' | 'not_urgent';

  admissionReason: string;
  diagnosis?: string;
  observations?: string;

  status: 'active' | 'discharged' | 'triage';
  tenantId: string;
  createdAt: string | any;
  updatedAt: string | any;
}

export interface Prescription {
  id: string;
  hospitalizationId: string;
  patientId: string;
  patientName: string;
  professionalId: string;
  professionalName: string;

  productId?: string;
  productName: string;
  dosage: string;
  calculatedDose?: string;
  route: 'IV' | 'IM' | 'SC' | 'VO' | 'Tópico' | 'Inalatório' | string;
  frequency: string;
  startDate: string;
  startTime: string;
  endDate?: string;
  duration?: string;
  instructions?: string;

  status: 'active' | 'suspended' | 'completed';
  tenantId: string;
  createdAt: string | any;
}

export interface ScheduledDose {
  id: string;
  prescriptionId: string;
  hospitalizationId: string;
  patientId: string;
  patientName: string;
  productId?: string;
  productName: string;
  dosage: string;
  route: string;
  scheduledDate: string;
  scheduledTime: string;

  status: 'pending' | 'administered' | 'overdue' | 'skipped';
  administeredAt?: string | any;
  administeredBy?: string;
  administeredById?: string;
  skippedReason?: string;

  stockDeducted: boolean;
  quantity?: number;
  unit?: string;

  tenantId: string;
  createdAt: string | any;
}

export interface HospitalizationEvolution {
  id: string;
  hospitalizationId: string;
  patientId: string;
  professionalId: string;
  professionalName: string;
  date: string;
  time: string;
  text: string;
  weight?: number;
  temperature?: number;
  tenantId: string;
  createdAt: string | any;
}

// ─────────────────────────────────────────────────────────────────────────────
// CIRURGIAS (SURGERIES)
// ─────────────────────────────────────────────────────────────────────────────

export interface AnesthesiaMedication {
  productId?: string;
  productName: string;
  dose: string;           // "0.05 mg/kg"
  calculatedDose?: string; // dose calculada para o peso
  route: string;          // "IV", "IM", "SC"
  time?: string;          // horário de administração
  quantity?: number;      // quantidade usada (para estoque)
  unit?: string;
}

export interface SurgicalAdmission {
  asaClassification: 'I' | 'II' | 'III' | 'IV' | 'V';
  fastingHours?: number;
  fastingConfirmed: boolean;
  preOpExams?: string;
  examsResult?: string;
  admissionWeight?: number;
  admissionTemperature?: number;
  admissionHeartRate?: number;
  admissionRespiratoryRate?: number;
  admissionPressure?: string;
  admissionSpO2?: number;
  allergies?: string;
  currentMedications?: string;
  previousSurgeries?: string;
  relevantHistory?: string;
  consentSigned: boolean;
  consentSignedAt?: string | any;
  consentSignedBy?: string;
  surgicalPurpose: string;
  clinicalIndication: string;
  admittedAt?: string | any;
  admittedBy?: string;
}

export interface AnesthesiaProtocol {
  type: 'general' | 'epidural' | 'local' | 'loco_regional' | 'combined';
  mpa: AnesthesiaMedication[];
  induction: AnesthesiaMedication[];
  maintenance: string;
  maintenanceMedications?: AnesthesiaMedication[];
  analgesia?: AnesthesiaMedication[];
  monitoring: string[];
  anesthesiaNotes?: string;
  recoveryNotes?: string;
  recoveryTime?: number;
  extubationTime?: string;
}

export interface SurgicalProcedure {
  startTime?: string;
  endTime?: string;
  duration?: number;
  procedureName: string;
  procedureDescription: string;
  technique?: string;
  findings?: string;
  complications?: string;
  synthesis?: string;
  biopsySent: boolean;
  biopsyDescription?: string;
  hemostasis?: string;
  drainage?: string;
  dressing?: string;
}

export interface SurgeryPrescriptionItem {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface PostOperative {
  instructions: string;
  homeMedications: SurgeryPrescriptionItem[];
  returnDate?: string;
  returnInstructions?: string;
  restrictions?: string;
  notes?: string;
  dischargedAt?: string | any;
  dischargedBy?: string;
}

export interface SurgicalSupplyUsed {
  productId?: string;
  productName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  category?: 'anesthesia' | 'surgical_material' | 'medication' | 'other';
}

export interface Surgery {
  id: string;
  patientId: string;
  patientName: string;
  species: string;
  breed?: string;
  sex?: string;
  weight?: number;
  age?: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  surgeonId: string;
  surgeonName: string;
  anesthesiologistId?: string;
  anesthesiologistName?: string;
  assistantId?: string;
  assistantName?: string;
  scrubNurseId?: string;
  scrubNurseName?: string;
  scheduledDate: string;
  scheduledTime: string;
  estimatedDuration?: number;
  admission: SurgicalAdmission;
  anesthesia: AnesthesiaProtocol;
  procedure: SurgicalProcedure;
  postOp: PostOperative;
  suppliesUsed: SurgicalSupplyUsed[];
  status: 'scheduled' | 'admission' | 'in_progress' | 'completed' | 'cancelled';
  tenantId: string;
  createdAt: string | any;
  updatedAt: string | any;
}

export const saveSurgery = async (surgery: Surgery): Promise<void> => {
  if (!db) return;
  const safeId = surgery.id || `surg_${Date.now()}`;
  await setDoc(doc(surgeriesCol(), safeId), {
    ...surgery,
    id: safeId,
    updatedAt: new Date().toISOString()
  }, { merge: true });
};

export const getSurgery = async (id: string): Promise<Surgery | null> => {
  if (!db) return null;
  const snap = await getDoc(doc(surgeriesCol(), id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Surgery) : null;
};

export const subscribeSurgeries = (
  callback: (surgeries: Surgery[]) => void
): (() => void) => {
  if (!db) { callback([]); return () => {}; }
  return onSnapshot(
    surgeriesCol(),
    snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Surgery));
      list.sort((a, b) => (a.scheduledDate + a.scheduledTime).localeCompare(b.scheduledDate + b.scheduledTime));
      callback(list);
    },
    err => { console.error('subscribeSurgeries:', err.code, err.message); callback([]); }
  );
};

export const completeSurgery = async (
  surgery: Surgery,
  operatorName: string
): Promise<void> => {
  if (!db) return;

  const batch = writeBatch(db);
  const now = new Date().toISOString();

  // 1. Update surgery status
  const surgRef = doc(surgeriesCol(), surgery.id);
  batch.update(surgRef, {
    status: 'completed',
    'postOp.dischargedAt': now,
    'postOp.dischargedBy': operatorName,
    updatedAt: now
  });

  // Collect all anesthesia medications that have productId + quantity
  const anesthMeds: AnesthesiaMedication[] = [
    ...(surgery.anesthesia?.mpa || []),
    ...(surgery.anesthesia?.induction || []),
    ...(surgery.anesthesia?.maintenanceMedications || []),
    ...(surgery.anesthesia?.analgesia || []),
  ];

  // Combine with supplies
  type StockItem = { productId: string; quantity: number; name: string };
  const stockItems: StockItem[] = [];

  for (const med of anesthMeds) {
    if (med.productId && med.quantity) {
      stockItems.push({ productId: med.productId, quantity: med.quantity, name: med.productName });
    }
  }
  for (const sup of (surgery.suppliesUsed || [])) {
    if (sup.productId && sup.quantity) {
      stockItems.push({ productId: sup.productId, quantity: sup.quantity, name: sup.productName });
    }
  }

  // 2. Deduct stock for each item
  for (const item of stockItems) {
    const pRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'products', item.productId);
    const pSnap = await getDoc(pRef);
    if (pSnap.exists()) {
      const pData = pSnap.data() as Product;
      const newStock = (pData.currentStock || 0) - item.quantity;
      batch.update(pRef, { currentStock: newStock, updatedAt: now });

      // 3. Create alert if below minimum
      if (newStock < (pData.minStock || 0)) {
        const alertRef = doc(stockAlertsCol());
        batch.set(alertRef, {
          id: alertRef.id,
          productId: item.productId,
          productName: item.name,
          currentStock: newStock,
          minStock: pData.minStock || 0,
          alertType: newStock <= 0 ? 'out_of_stock' : 'below_minimum',
          resolvedAt: null,
          createdAt: now
        });
      }
    }
  }

  // 4. Register timeline event in records collection
  const recRef = doc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'records'));
  batch.set(recRef, {
    id: recRef.id,
    patientId: surgery.patientId,
    patientName: surgery.patientName,
    clientId: surgery.clientId,
    type: 'surgery',
    title: `Cirurgia — ${surgery.procedure?.procedureName || surgery.admission?.surgicalPurpose || 'Procedimento'}`,
    description: surgery.procedure?.procedureDescription || '',
    professionalName: surgery.surgeonName,
    date: surgery.scheduledDate,
    time: surgery.scheduledTime,
    status: 'completed',
    referenceId: surgery.id,
    referenceCollection: 'surgeries',
    tenantId: APP_ID,
    createdAt: now
  });

  await batch.commit();

  // 5. If returnDate, create suggested appointment
  if (surgery.postOp?.returnDate) {
    try {
      const aptId = `apt_${Date.now()}`;
      await setDoc(doc(db, 'bea_data', APP_ID, 'appointments', aptId), {
        id: aptId,
        date: surgery.postOp.returnDate,
        startTime: '09:00',
        endTime: '09:30',
        clientId: surgery.clientId,
        clientName: surgery.clientName,
        patientId: surgery.patientId,
        patientName: surgery.patientName,
        serviceId: '',
        serviceName: 'Retorno Pós-op',
        professionalId: surgery.surgeonId,
        professionalName: surgery.surgeonName,
        status: 'scheduled',
        notes: `Retorno pós-operatório — ${surgery.procedure?.procedureName || surgery.admission?.surgicalPurpose}`,
        createdAt: now,
        updatedAt: now
      });
    } catch (err) {
      console.warn('Erro ao criar agendamento de retorno:', err);
    }
  }
};