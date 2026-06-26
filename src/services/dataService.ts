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
  deleteField
} from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// PATHS
//   bea_data/{appId}/customers/{id}
//   bea_data/{appId}/daily_flow/{date}       ← entradas do dia
//   bea_data/{appId}/daily_expenses/{date}   ← despesas do dia (novo)
//   bea_data/{appId}/interactions/{id}
// ─────────────────────────────────────────────────────────────────────────────

const APP_ID = 'bea_mvp';

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
const produtosCol = () => CFG_COL('produtos');
const produtoDoc = (id: string) => CFG_DOC('produtos', id);
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
// PRODUTOS & ESTOQUE
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

/** Importa produtos em lote. */
export const batchSaveProdutos = async (produtos: Produto[]): Promise<void> => {
  if (!db || produtos.length === 0) return;
  const CHUNK = 499;
  for (let i = 0; i < produtos.length; i += CHUNK) {
    const batch = writeBatch(db);
    for (const p of produtos.slice(i, i + CHUNK)) {
      batch.set(produtoDoc(p.id), p, { merge: true });
    }
    await batch.commit();
  }
};

/** Listener em tempo real para todos os produtos. */
export const subscribeProdutos = (
  callback: (produtos: Produto[]) => void
): (() => void) => {
  if (!db) { callback([]); return () => { }; }
  return onSnapshot(
    produtosCol(),
    snap => {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as Produto));
      list.sort((a, b) => a.nome.localeCompare(b.nome));
      callback(list);
    },
    err => { console.error('subscribeProdutos:', err.code, err.message); callback([]); }
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
};