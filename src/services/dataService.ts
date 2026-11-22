import { db, functions } from './firebase';
import { httpsCallable } from 'firebase/functions';
import {
  generateDispensationToken,
  calcularValidadeReceita,
  PRAZOS_VALIDADE_PADRAO,
  formatDataExtensoPtBR,
  formatIdadeCalculada,
  getTituloCentralReceita,
  mascararCpf
} from './dispensationService';
export {
  generateDispensationToken,
  calcularValidadeReceita,
  PRAZOS_VALIDADE_PADRAO,
  formatDataExtensoPtBR,
  formatIdadeCalculada,
  getTituloCentralReceita,
  mascararCpf
};
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
  limit,
  addDoc
} from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-TENANT ARCHITECTURE & CONTEXT
//   clinicas/{tenantId}/...
//   usuarios/{uid}
//   tenants/{tenantId}
//   staff_email_index/{email}
// ─────────────────────────────────────────────────────────────────────────────

let currentTenantId: string =
  localStorage.getItem('clinicos_active_tenant') ||
  import.meta.env.VITE_APP_TENANT_ID ||
  'clinicos_demo';

export const getActiveTenantId = (): string => {
  return currentTenantId;
};

export const setActiveTenantId = (tenantId: string): void => {
  if (!tenantId) return;
  currentTenantId = tenantId;
  localStorage.setItem('clinicos_active_tenant', tenantId);
  window.dispatchEvent(new CustomEvent('tenantChanged', { detail: { tenantId } }));
};

export const APP_ID = getActiveTenantId();

// Helper central para TODAS as coleções operacionais da clínica:
export const TENANT_COL = (col: string, tenantId: string = getActiveTenantId()) =>
  collection(db!, 'clinicas', tenantId, col);

export const TENANT_DOC = (col: string, id: string, tenantId: string = getActiveTenantId()) =>
  doc(db!, 'clinicas', tenantId, col, id);

// Aliases operacionais e de configuração
export const OP_COL = (col: string, tenantId: string = getActiveTenantId()) => TENANT_COL(col, tenantId);
export const OP_DOC = (col: string, id: string, tenantId: string = getActiveTenantId()) => TENANT_DOC(col, id, tenantId);

export const CFG_COL = (col: string, tenantId: string = getActiveTenantId()) => TENANT_COL(col, tenantId);
export const CFG_DOC = (col: string, id: string, tenantId: string = getActiveTenantId()) => TENANT_DOC(col, id, tenantId);

const customersCol = (tenantId: string = getActiveTenantId()) => TENANT_COL('customers', tenantId);
const dailyFlowCol = (tenantId: string = getActiveTenantId()) => TENANT_COL('daily_flow', tenantId);
const dailyExpensesCol = (tenantId: string = getActiveTenantId()) => TENANT_COL('daily_expenses', tenantId);

const dailyFlowDoc = (date: string, tenantId: string = getActiveTenantId()) => TENANT_DOC('daily_flow', date, tenantId);
const customerDoc = (id: string, tenantId: string = getActiveTenantId()) => TENANT_DOC('customers', id, tenantId);
const dailyExpensesDoc = (date: string, tenantId: string = getActiveTenantId()) => TENANT_DOC('daily_expenses', date, tenantId);

// User profile vive na raiz em /usuarios/{uid}
const userDoc = (uid: string) => doc(db!, 'usuarios', uid);
const vendaDoc = (id: string, tenantId: string = getActiveTenantId()) => TENANT_DOC('vendas', id, tenantId);
const caixaDoc = (date: string, tenantId: string = getActiveTenantId()) => TENANT_DOC('caixa', date, tenantId);

export const termosAtendimentoCol = (tenantId: string = getActiveTenantId()) => TENANT_COL('termos_atendimento', tenantId);
export const auditoriasComplianceCol = (tenantId: string = getActiveTenantId()) => TENANT_COL('auditorias_compliance', tenantId);
export const receitasCol = (tenantId: string = getActiveTenantId()) => TENANT_COL('receitas', tenantId);
export const verificacaoReceitasCol = () => collection(db!, 'verificacao_receitas');
export const tokensReceitaCol = () => collection(db!, 'tokens_receita');
export const auditoriaFarmaciaCol = () => collection(db!, 'auditoria_farmacia');

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
  nascimento?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  uf?: string;
  cep?: string;
  rankingABC?: string;
  ticketMedio?: string;
  observacoes?: string;
  cadastradoEm?: string;
  totalGasto?: number;
  totalAtendimentos?: number;
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
  cpf?: string;
  registroMapa?: string;
  cpfPrescritorModo?: 'ocultar' | 'mascarado' | 'completo';
  status: 'ativo' | 'inativo';
  photoURL?: string | null;
  staffId?: string;
  activeTenantId?: string;
  tenants?: string[];
  clinicName?: string;
}

// ─── Assinatura de Receitas ICP-Brasil & Token de Dispensação ───────────────
export type StatusReceita = 'rascunho' | 'aguardando_assinatura' | 'assinada' | 'substituida' | 'cancelada';

export type SubtipoReceita = 'simples' | 'controle_especial' | 'antimicrobiano' | 'magistral';
export type StatusDispensacao = 'nao_dispensada' | 'parcialmente_dispensada' | 'dispensada' | 'cancelada';

export interface ItemReceitaPrescrita {
  id: string;
  produto: string; // Ex: "Amoxicilina + Clavulanato de Potássio"
  concentracao?: string; // Ex: "250mg"
  quantidadePrescrita: number; // Ex: 1
  unidade: string; // Ex: "caixa(s)", "frasco(s)", "comprimido(s)"
  quantidadeExtenso: string; // Ex: "1 (uma) caixa com 10 (dez) comprimidos"
  posologia: string; // Ex: "Administrar 1 comprimido por via oral a cada 12 horas durante 7 dias"
  quantidadeDispensada?: number;
  saldoRestante?: number;
}

export interface DispensacaoItemInfo {
  itemId: string;
  produto: string;
  quantidade: number;
  lote?: string;
}

export interface DispensacaoRegistro {
  id: string;
  protocolo: string; // DISP-{token}-{n}
  dataHora: string;
  farmaceuticoNome: string;
  farmaceuticoCrf: string;
  farmaceuticoUf: string;
  farmaciaNome: string;
  farmaciaCnpj: string;
  itensDispensados: DispensacaoItemInfo[];
  declaracaoConferida: boolean;
  ip?: string;
  userAgent?: string;
}

export interface TokenReceitaIndex {
  token: string;
  tenantId: string;
  receitaId: string;
  criadoEm: string;
  status: StatusReceita;
  statusDispensacao: StatusDispensacao;
  subtipo: SubtipoReceita;
  validadeAte: string;
  requerAssinatura: boolean;
  isAssinada: boolean;
  pdfAssinadoUrl?: string;
}

export interface AssinaturaDigitalInfo {
  em: string;
  titular: string;
  cpfMascarado: string;
  emissorAC: string;
  serial: string;
  hashSha256: string;
  metodo: 'upload' | 'psc';
  provedor?: string;
}

export interface ReceitaDigital {
  id: string;
  codigoVerificacao: string; // 10 caracteres aleatórios para compatibilidade
  tokenDispensacao: string; // Formato DDMMAAAA-XXXXXX
  tenantId: string;
  pacienteId: string;
  atendimentoId?: string;
  tipo: 'receita_simples' | 'receita_manipulada';
  subtipo: SubtipoReceita;
  status: StatusReceita;
  statusDispensacao: StatusDispensacao;

  // Veterinário
  veterinarioId: string;
  veterinarioNome: string;
  veterinarioCrmv: string;
  veterinarioCpf?: string;
  registroMapa?: string;
  cpfPrescritorModo?: 'ocultar' | 'mascarado' | 'completo';

  // Paciente
  pacienteNome: string;
  pacienteEspecie?: string;
  pacienteRaca?: string;
  pacienteIdade?: string;
  pacientePeso?: number | string;
  pacienteDataPeso?: string;

  // Tutor
  tutorNome: string;
  tutorCpf?: string;
  tutorTelefone?: string;
  tutorEndereco?: string;

  // Itens e Conteúdo Clínico Estruturado
  itens: ItemReceitaPrescrita[];
  orientacoes?: string[];
  observacoesResponsavel?: string;
  conteudoPrescricao: string;
  conteudoClinico?: string;
  baseLegal: string;
  isControlado?: boolean;
  numeroNotificacaoSipeagro?: string;

  // Validade
  validadeDias: number;
  validadeAte: string;

  // Dispensações Registradas
  dispensacoes?: DispensacaoRegistro[];

  // Cancelamento
  motivoCancelamento?: string;
  canceladoEm?: string;
  canceladoPor?: string;

  // Controle de Versões (para receitas substituídas)
  versao: number;
  substituiReceitaId?: string;
  substituidaPorReceitaId?: string;

  // Integridade do Arquivo PDF
  originalSize?: number;
  originalHashSha256?: string;
  originalPdfUrl?: string;
  pdfAssinadoPath?: string;
  pdfAssinadoUrl?: string;

  // Metadados da Assinatura Digital
  assinatura?: AssinaturaDigitalInfo;

  criadoEm: string;
  atualizadoEm: string;
  assinadoEm?: string;
}

export interface VerificacaoReceitaPublica {
  codigo: string;
  tenantId: string;
  receitaId: string;
  nomeVeterinario: string;
  crmvVeterinario: string;
  dataEmissao: string;
  dataAssinatura?: string;
  status: StatusReceita;
  pdfUrl?: string;
  hashSha256?: string;
  atualizadoEm?: string;
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

export type TipoTermo = 'tcle_geral' | 'tcle_sedacao' | 'tcle_procedimento' | 'lgpd_domiciliar' | 'autorizacao_imagem' | 'off_label' | 'recusa_conduta' | 'destinacao_cadaver' | 'receita_simples' | 'receita_manipulada';

export interface TermoAtendimento {
  id: string;
  pacienteId: string;
  atendimentoId?: string;
  tipo: TipoTermo;
  status: 'pendente' | 'assinado' | 'recusado_com_testemunhas';
  pdfUrl?: string;
  baseLegal: string;
  conteudoClinico: string; // O que foi preenchido de variável
  geradoEm: string;
  geradoPor: string;
  numeroNotificacaoSipeagro?: string;
  isControlado?: boolean;
}

export interface AuditoriaCompliance {
  id: string;
  veterinarioId: string;
  tipo: 'checklist_compliance' | 'conferencia_maleta';
  data: string;
  itensConformes: number;
  itensTotal: number;
  parecer?: 'apto' | 'adequacao' | 'critico';
  pdfUrl?: string;
}

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

export const configDoc = (section: string = 'integrations', tenantId: string = getActiveTenantId()) => doc(db!, 'clinicas', tenantId, 'config', section);
export const servicesCol = (tenantId: string = getActiveTenantId()) => TENANT_COL('services', tenantId);
export const productsCol = (tenantId: string = getActiveTenantId()) => TENANT_COL('products', tenantId);
export const productDoc = (id: string, tenantId: string = getActiveTenantId()) => TENANT_DOC('products', id, tenantId);

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
  clienteInfo?: { nome: string; animal: string; clienteId?: string },
  maquininha: string = 'N/A',
  _dadosPrazo?: any
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
  cpf?: string;
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
// ─── Assistente IA (Exames Gerais) ──────────────────────────────────────────

export const subscribeAllExames = (callback: (exames: Exame[]) => void) => {
  if (!db) return () => {};
  
  // Ordenado por data de upload decrescente
  const q = query(examesCol(), orderBy('dataUpload', 'desc'), limit(100));

  return onSnapshot(q, (snapshot) => {
    const exames = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as Exame[];
    callback(exames);
  });
};

export const subscribeCasoClinico = (id: string, callback: (caso: CasoClinico | null) => void) => {
  if (!db) return () => {};
  const docRef = doc(casosClinicosCol(), id);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as CasoClinico);
    } else {
      callback(null);
    }
  });
};

export const subscribeAllCasos = (callback: (casos: CasoClinico[]) => void) => {
  if (!db) return () => {};
  
  const q = query(casosClinicosCol(), orderBy('criadoEm', 'desc'), limit(100));

  return onSnapshot(q, (snapshot) => {
    const casos = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as CasoClinico[];
    callback(casos);
  });
};

export const addCasoClinico = async (caso: Omit<CasoClinico, 'id' | 'criadoEm'>): Promise<string> => {
  if (!db) throw new Error('Firestore não inicializado');
  const docRef = await addDoc(casosClinicosCol(), {
    ...caso,
    criadoEm: new Date().toISOString()
  });
  // Update doc with its own ID
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
};

export const updateCasoClinico = async (id: string, caso: Partial<CasoClinico>): Promise<void> => {
  if (!db) throw new Error('Firestore não inicializado');
  const docRef = doc(casosClinicosCol(), id);
  await updateDoc(docRef, caso);
};

export const subscribeAnalisesPorCaso = (casoId: string, callback: (analises: AnaliseClinica[]) => void) => {
  if (!db) return () => {};
  const q = query(analisesCol(), where('casoId', '==', casoId), orderBy('numero', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const analises = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as AnaliseClinica[];
    callback(analises);
  });
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
// CLINICOS IA (EXAMES, ANÁLISES E NOTAS)
// ─────────────────────────────────────────────────────────────────────────────

export interface CasoClinico {
  id: string;
  pacienteId: string;
  sintomasPrincipais: string;
  historicoClinico: string;
  examesIds: string[];
  status: 'pendente' | 'analisando' | 'analisado' | 'erro';
  resumoCaso?: string;
  criadoEm: string;
  tenantId: string;
  isDomiciliar?: boolean;
}

export interface Exame {
  id: string;
  pacienteId: string;
  tipo: string;
  fileUrl: string;
  dataUpload: string;
  tenantId: string;
  // Campos de encaminhamento
  isEncaminhamento?: boolean;
  encaminhamento?: {
    clinicaOrigem?: string;
    crmvOrigem?: string;
    motivoEncaminhamento?: string;
    veterinarioOrigem?: string;
  };
}

export interface AnaliseClinica {
  id: string;
  casoId: string;
  numero: number;
  dataAnalise: string;
  examesConsiderados: string[];
  interpretacaoClinica?: string;
  diferenciais: any[];
  achados?: string[];
  interpretacaoExames?: {
    parametro: string;
    resultado: string;
    referencia: string;
    interpretacao: string;
  }[];
  textoExplicativoExames?: string;
  condutaSugerida: string;
  prescricoesSugeridas?: string[];
  pdfUrl?: string;
  tenantId: string;
}

export interface NotaExplicativa {
  id: string;
  pacienteId: string;
  casoId: string;
  analiseId: string;
  conteudo: string;
  geradaEm: string;
  status: 'rascunho' | 'confirmada';
  confirmadaEm?: string;
  tenantId: string;
}

export interface ProtocoloClinico {
  id: string;
  titulo: string;
  tags: string[];
  conteudo: string;
  fonteReferencia?: string;
  ativo: boolean;
  criadoPor: string;
  criadoEm: string;
  versao: number;
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

export const saveMedicalRecord = async (record: MedicalRecord, tenantId: string = getActiveTenantId()): Promise<void> => {
  if (!db) return;
  await setDoc(doc(recordsCol(tenantId), record.id), record, { merge: true });
};

export const subscribeMedicalRecords = (
  clientId: string,
  callback: (records: MedicalRecord[]) => void,
  tenantId: string = getActiveTenantId()
) => {
  if (!db) return () => {};
  const q = query(recordsCol(tenantId), where('clientId', '==', clientId));
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

export const deleteNotaExplicativa = async (notaId: string): Promise<void> => {
  if (!db) return;
  const colRef = notasExplicativasCol();
  await deleteDoc(doc(colRef, notaId));
};

export const saveProtocolo = async (protocolo: ProtocoloClinico): Promise<void> => {
  if (!db) return;
  const colRef = protocolosCol();
  await setDoc(doc(colRef, protocolo.id), protocolo, { merge: true });
};

export const subscribeProtocolos = (callback: (protocolos: ProtocoloClinico[]) => void) => {
  if (!db) return () => {};
  const colRef = protocolosCol();
  const q = query(colRef, orderBy('titulo', 'asc'));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(doc => doc.data() as ProtocoloClinico);
    callback(list);
  }, err => {
    console.error('subscribeProtocolos:', err);
    callback([]);
  });
};

export const notificationsLogCol = (tenantId: string = getActiveTenantId()) => TENANT_COL('notifications_log', tenantId);

export const saveNotificationLog = async (log: NotificationLog, tenantId: string = getActiveTenantId()): Promise<void> => {
  if (!db) return;
  await setDoc(doc(notificationsLogCol(tenantId), log.id), log, { merge: true });
};

export const subscribeNotificationLogs = (
  callback: (logs: NotificationLog[]) => void,
  tenantId: string = getActiveTenantId()
) => {
  if (!db) return () => {};
  const q = query(notificationsLogCol(tenantId), orderBy('sentAt', 'desc'), limit(50));
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

export interface SystemCheck {
  status: 'Normal' | 'Alterado' | '';
  notes?: string;
}

export interface PhysicalExamChecklist {
  nutricional?: string; // Escore de 1 a 9
  hidratacao?: SystemCheck;
  mucosas?: SystemCheck;
  olhos?: SystemCheck;
  ouvidos?: SystemCheck;
  pele?: SystemCheck;
  linfonodos?: SystemCheck;
  cardiorrespiratorio?: SystemCheck;
  digestorio?: SystemCheck;
  geniturinario?: SystemCheck;
  locomotor?: SystemCheck;
  neurologico?: SystemCheck;
  reprodutor?: SystemCheck;
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
  physicalExamChecklist?: PhysicalExamChecklist;
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

export const consultationsCol = (tenantId: string = getActiveTenantId()) => TENANT_COL('consultas_clinicas', tenantId);
export const stockAlertsCol = (tenantId: string = getActiveTenantId()) => TENANT_COL('stock_alerts', tenantId);
export const hospitalizationsCol = (tenantId: string = getActiveTenantId()) => TENANT_COL('hospitalizations', tenantId);
export const surgeriesCol = (tenantId: string = getActiveTenantId()) => TENANT_COL('surgeries', tenantId);
export const recordsCol = (tenantId: string = getActiveTenantId()) => TENANT_COL('records', tenantId);
export const prescriptionsCol = (tenantId: string = getActiveTenantId()) => TENANT_COL('prescriptions', tenantId);
export const scheduledDosesCol = (tenantId: string = getActiveTenantId()) => TENANT_COL('scheduled_doses', tenantId);
export const hospitalizationEvolutionsCol = (tenantId: string = getActiveTenantId()) => TENANT_COL('hospitalization_evolutions', tenantId);
export const casosClinicosCol = (tenantId: string = getActiveTenantId()) => TENANT_COL('casos_clinicos', tenantId);
export const examesCol = (tenantId: string = getActiveTenantId()) => TENANT_COL('exames', tenantId);
export const analisesCol = (tenantId: string = getActiveTenantId()) => TENANT_COL('analises', tenantId);
export const notasExplicativasCol = (tenantId: string = getActiveTenantId()) => TENANT_COL('notas_explicativas', tenantId);
export const protocolosCol = (tenantId: string = getActiveTenantId()) => TENANT_COL('protocolos_clinicos', tenantId);

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
export const subscribeExames = (
  pacienteId: string,
  callback: (exames: Exame[]) => void
) => {
  if (!db) return () => {};
  const q = query(examesCol(), where('pacienteId', '==', pacienteId));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => doc.data() as Exame);
    data.sort((a, b) => b.dataUpload.localeCompare(a.dataUpload));
    callback(data);
  });
};

export const subscribeConsultasPaciente = (
  pacienteId: string,
  callback: (list: ConsultaAtendimento[]) => void
): (() => void) => {
  if (!db) { callback([]); return () => {}; }
  const q = query(consultasClinicasCol(), where('pacienteId', '==', pacienteId));
  return onSnapshot(q, snap => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ConsultaAtendimento));
    list.sort((a, b) => (b.data || b.criadoEm || '').localeCompare(a.data || a.criadoEm || ''));
    callback(list);
  }, err => {
    console.error('subscribeConsultasPaciente:', err);
    callback([]);
  });
};

export const subscribeAllConsultasAtendimento = (
  callback: (list: ConsultaAtendimento[]) => void
): (() => void) => {
  if (!db) { callback([]); return () => {}; }
  return onSnapshot(consultasClinicasCol(), snap => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ConsultaAtendimento));
    list.sort((a, b) => (b.data || b.criadoEm || '').localeCompare(a.data || a.criadoEm || ''));
    callback(list);
  }, err => {
    console.error('subscribeAllConsultasAtendimento:', err);
    callback([]);
  });
};

export const subscribeAnalises = (
  pacienteId: string,
  callback: (analises: AnaliseClinica[]) => void
) => {
  if (!db) return () => {};
  const q = query(analisesCol(), where('pacienteId', '==', pacienteId));
  return  onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AnaliseClinica));
    data.sort((a, b) => b.dataAnalise.localeCompare(a.dataAnalise));
    callback(data);
  });
};

export const subscribeAllAnalises = (
  callback: (analises: AnaliseClinica[]) => void
) => {
  if (!db) return () => {};
  const q = query(analisesCol(), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => doc.data() as AnaliseClinica);
    callback(data);
  });
};

export const subscribeNotas = (
  pacienteId: string,
  callback: (notas: NotaExplicativa[]) => void
) => {
  if (!db) return () => {};
  const q = query(notasExplicativasCol(), where('pacienteId', '==', pacienteId));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => doc.data() as NotaExplicativa);
    data.sort((a, b) => b.geradaEm.localeCompare(a.geradaEm));
    callback(data);
  });
};

export const saveTermoAtendimento = async (termo: TermoAtendimento): Promise<void> => {
  if (!db) return;
  const safeId = termo.id || `termo_${Date.now()}`;
  await setDoc(doc(termosAtendimentoCol(), safeId), {
    ...termo,
    id: safeId
  }, { merge: true });
};

export const subscribeTermosAtendimento = (
  pacienteId: string,
  callback: (termos: TermoAtendimento[]) => void
) => {
  if (!db) return () => {};
  const q = query(termosAtendimentoCol(), where('pacienteId', '==', pacienteId));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => doc.data() as TermoAtendimento);
    data.sort((a, b) => b.geradoEm.localeCompare(a.geradoEm));
    callback(data);
  });
};

export const subscribeAllTermosAtendimento = (
  callback: (termos: TermoAtendimento[]) => void
) => {
  if (!db) return () => {};
  return onSnapshot(termosAtendimentoCol(), (snapshot) => {
    const data = snapshot.docs.map((doc) => doc.data() as TermoAtendimento);
    data.sort((a, b) => (b.geradoEm || '').localeCompare(a.geradoEm || ''));
    callback(data);
  }, (err) => {
    console.error('subscribeAllTermosAtendimento:', err);
    callback([]);
  });
};

// ─── GESTÃO DE RECEITAS DIGITAIS (ICP-BRASIL) ────────────────────────────────

export function generateVerificationCode(length: number = 10): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      code += chars[array[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return code;
}

export const saveReceita = async (receita: ReceitaDigital): Promise<string> => {
  if (!db) throw new Error('Banco de dados não inicializado');
  const safeId = receita.id || `rec_${Date.now()}`;
  const tenantId = receita.tenantId || getActiveTenantId();
  const codigo = receita.codigoVerificacao || generateVerificationCode(10);
  const now = new Date().toISOString();

  // Subtipo da receita
  const subtipo: SubtipoReceita =
    receita.subtipo ||
    (receita.tipo === 'receita_manipulada'
      ? 'magistral'
      : receita.isControlado
      ? 'controle_especial'
      : 'simples');

  // Token de dispensação (DDMMAAAA-XXXXXX) — gerado uma única vez
  const token = receita.tokenDispensacao || generateDispensationToken(new Date(receita.criadoEm || now));

  // Validade da receita
  const { validadeAte, validadeDias } = calcularValidadeReceita(
    subtipo,
    receita.criadoEm || now,
    receita.validadeDias
  );

  // Sanitização e cálculo dos saldos dos itens prescritos
  const itensFormatados: ItemReceitaPrescrita[] = (receita.itens || []).map((item, idx) => {
    const qtdPrescrita = Number(item.quantidadePrescrita) || 1;
    const qtdDispensada = Number(item.quantidadeDispensada) || 0;
    const saldo = item.saldoRestante !== undefined ? Number(item.saldoRestante) : Math.max(0, qtdPrescrita - qtdDispensada);
    return {
      ...item,
      id: item.id || `item_${idx + 1}_${Date.now()}`,
      quantidadePrescrita: qtdPrescrita,
      quantidadeDispensada: qtdDispensada,
      saldoRestante: saldo,
    };
  });

  const statusDispensacao: StatusDispensacao = receita.statusDispensacao || 'nao_dispensada';

  const fullReceita: ReceitaDigital = {
    ...receita,
    id: safeId,
    tenantId,
    codigoVerificacao: codigo,
    tokenDispensacao: token,
    subtipo,
    itens: itensFormatados,
    statusDispensacao,
    validadeAte: receita.validadeAte || validadeAte,
    validadeDias: receita.validadeDias || validadeDias,
    versao: receita.versao || 1,
    status: receita.status || 'rascunho',
    criadoEm: receita.criadoEm || now,
    atualizadoEm: now,
  };

  // 1. Salvar no namespace do tenant
  await setDoc(doc(receitasCol(tenantId), safeId), fullReceita, { merge: true });

  // 2. Registrar no índice global /tokens_receita/{token} (para consulta na farmácia)
  const requerAssinatura = subtipo !== 'simples';
  const isAssinada = fullReceita.status === 'assinada';
  await setDoc(
    doc(tokensReceitaCol(), token),
    {
      token,
      tenantId,
      receitaId: safeId,
      criadoEm: fullReceita.criadoEm,
      status: fullReceita.status,
      statusDispensacao: fullReceita.statusDispensacao,
      subtipo: fullReceita.subtipo,
      validadeAte: fullReceita.validadeAte,
      requerAssinatura,
      isAssinada,
      pdfAssinadoUrl: fullReceita.pdfAssinadoUrl || null,
      atualizadoEm: now,
    },
    { merge: true }
  );

  // 3. Criar ou sincronizar registro na coleção pública de verificação
  await setDoc(
    doc(verificacaoReceitasCol(), codigo),
    {
      codigo,
      tokenDispensacao: token,
      tenantId,
      receitaId: safeId,
      nomeVeterinario: fullReceita.veterinarioNome || '',
      crmvVeterinario: fullReceita.veterinarioCrmv || '',
      dataEmissao: fullReceita.criadoEm,
      dataAssinatura: fullReceita.assinadoEm || null,
      status: fullReceita.status,
      pdfUrl: fullReceita.pdfAssinadoUrl || null,
      hashSha256: fullReceita.assinatura?.hashSha256 || null,
      atualizadoEm: now,
    },
    { merge: true }
  );

  return safeId;
};

export const getReceita = async (
  receitaId: string,
  tenantId: string = getActiveTenantId()
): Promise<ReceitaDigital | null> => {
  if (!db) return null;
  const snap = await getDoc(doc(receitasCol(tenantId), receitaId));
  if (!snap.exists()) return null;
  return snap.data() as ReceitaDigital;
};

export const substituirReceita = async (
  receitaAntigaId: string,
  dadosNova: Partial<ReceitaDigital>,
  tenantId: string = getActiveTenantId()
): Promise<ReceitaDigital> => {
  if (!db) throw new Error('Banco de dados indisponível');
  const antigaSnap = await getDoc(doc(receitasCol(tenantId), receitaAntigaId));
  if (!antigaSnap.exists()) throw new Error('Receita anterior não encontrada');
  const antiga = antigaSnap.data() as ReceitaDigital;

  const now = new Date().toISOString();
  const novoId = `rec_${Date.now()}`;
  const novoCodigo = generateVerificationCode(10);
  const novoToken = generateDispensationToken(new Date());

  const novaReceita: ReceitaDigital = {
    ...antiga,
    ...dadosNova,
    id: novoId,
    tenantId,
    codigoVerificacao: novoCodigo,
    tokenDispensacao: novoToken,
    versao: (antiga.versao || 1) + 1,
    status: 'rascunho',
    statusDispensacao: 'nao_dispensada',
    substituiReceitaId: antiga.id,
    dispensacoes: [],
    originalSize: undefined,
    originalHashSha256: undefined,
    originalPdfUrl: undefined,
    pdfAssinadoPath: undefined,
    pdfAssinadoUrl: undefined,
    assinatura: undefined,
    assinadoEm: undefined,
    criadoEm: now,
    atualizadoEm: now,
  };

  // Travar a antiga como 'substituida'
  await updateDoc(doc(receitasCol(tenantId), receitaAntigaId), {
    status: 'substituida',
    statusDispensacao: 'cancelada',
    substituidaPorReceitaId: novoId,
    atualizadoEm: now,
  });

  // Atualizar índice global de tokens da receita antiga
  if (antiga.tokenDispensacao) {
    await updateDoc(doc(tokensReceitaCol(), antiga.tokenDispensacao), {
      status: 'substituida',
      statusDispensacao: 'cancelada',
      substituidaPorToken: novoToken,
      atualizadoEm: now,
    });
  }

  // Atualizar verificação pública da antiga
  if (antiga.codigoVerificacao) {
    await updateDoc(doc(verificacaoReceitasCol(), antiga.codigoVerificacao), {
      status: 'substituida',
      atualizadoEm: now,
    });
  }

  // Salvar a nova versão
  await saveReceita(novaReceita);
  return novaReceita;
};

export const cancelarReceita = async (
  receitaId: string,
  motivo: string = 'Cancelada pelo prescritor',
  canceladoPor?: string,
  tenantId: string = getActiveTenantId()
): Promise<void> => {
  if (!db) return;
  const now = new Date().toISOString();
  const snap = await getDoc(doc(receitasCol(tenantId), receitaId));
  if (!snap.exists()) return;
  const rec = snap.data() as ReceitaDigital;

  await updateDoc(doc(receitasCol(tenantId), receitaId), {
    status: 'cancelada',
    statusDispensacao: 'cancelada',
    motivoCancelamento: motivo,
    canceladoEm: now,
    canceladoPor: canceladoPor || 'Prescritor',
    atualizadoEm: now,
  });

  if (rec.tokenDispensacao) {
    await updateDoc(doc(tokensReceitaCol(), rec.tokenDispensacao), {
      status: 'cancelada',
      statusDispensacao: 'cancelada',
      motivoCancelamento: motivo,
      atualizadoEm: now,
    });
  }

  if (rec.codigoVerificacao) {
    await updateDoc(doc(verificacaoReceitasCol(), rec.codigoVerificacao), {
      status: 'cancelada',
      atualizadoEm: now,
    });
  }
};

export const subscribeReceitas = (
  pacienteId: string,
  callback: (receitas: ReceitaDigital[]) => void,
  tenantId: string = getActiveTenantId()
) => {
  if (!db) return () => {};
  const q = query(receitasCol(tenantId), where('pacienteId', '==', pacienteId));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((d) => d.data() as ReceitaDigital);
    data.sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
    callback(data);
  });
};

export const subscribeAllReceitas = (
  callback: (receitas: ReceitaDigital[]) => void,
  tenantId: string = getActiveTenantId()
) => {
  if (!db) return () => {};
  return onSnapshot(
    receitasCol(tenantId),
    (snapshot) => {
      const data = snapshot.docs.map((d) => d.data() as ReceitaDigital);
      data.sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
      callback(data);
    },
    (err) => {
      console.error('subscribeAllReceitas:', err);
      callback([]);
    }
  );
};

export const getReceitaPublica = async (
  codigo: string
): Promise<VerificacaoReceitaPublica | null> => {
  if (!db) return null;
  const snap = await getDoc(doc(verificacaoReceitasCol(), codigo));
  if (!snap.exists()) return null;
  return snap.data() as VerificacaoReceitaPublica;
};

export const saveAuditoriaCompliance = async (auditoria: AuditoriaCompliance): Promise<void> => {
  if (!db) return;
  const safeId = auditoria.id || `audit_${Date.now()}`;
  await setDoc(doc(auditoriasComplianceCol(), safeId), {
    ...auditoria,
    id: safeId
  }, { merge: true });
};

export const subscribeAuditoriasCompliance = (
  veterinarioId: string,
  callback: (auditorias: AuditoriaCompliance[]) => void
) => {
  if (!db) return () => {};
  const q = query(auditoriasComplianceCol(), where('veterinarioId', '==', veterinarioId));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => doc.data() as AuditoriaCompliance);
    data.sort((a, b) => b.data.localeCompare(a.data));
    callback(data);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSÁVEIS (TUTORES) E PACIENTES (ANIMAIS)
// ─────────────────────────────────────────────────────────────────────────────

export const responsaveisCol = (tenantId: string = getActiveTenantId()) => TENANT_COL('responsaveis', tenantId);
export const pacientesCol = (tenantId: string = getActiveTenantId()) => TENANT_COL('pacientes', tenantId);
export const consultasClinicasCol = (tenantId: string = getActiveTenantId()) => TENANT_COL('consultas_clinicas', tenantId);

export interface Responsavel {
  id: string;
  nomeCompleto: string;
  cpf: string;
  telefone: string;
  email: string;
  endereco?: string;
  criadoEm: string;
  tenantId?: string;
}

export interface Paciente {
  id: string;
  nome: string;
  especie: string;
  raca: string;
  sexo: string;
  idade: number | string;
  peso: number;
  tutorId: string;
  fotoUrl?: string;
  criadoEm: string;
  tenantId?: string;
  /** Paciente que veio a óbito (inclui eutanásia) */
  obito?: boolean;
  dataObito?: string;   // AAAA-MM-DD
  causaObito?: string;
}

export interface ExameFisicoItem {
  status: 'Normal' | 'Alterado';
  observacao?: string;
}

export interface ParametrosVitais {
  temperatura?: number | string;
  freqCardiaca?: number | string;
  freqRespiratoria?: number | string;
  tpc?: number | string;
  mucosas?: 'Rosadas' | 'Pálidas' | 'Ictéricas' | 'Cianóticas' | 'Congestas' | string;
  desidratacao?: string;
  ecc?: number | string;
  escoreDor?: number | string;
  pressaoSistolica?: number | string;
}

export interface ObservacaoAntesToque {
  estadoMental?: string;
  comportamento?: string;
  posturaMarcha?: string;
  padraoRespiratorio?: string;
  dorAparente?: string;
  observacoes?: string;
  nivelConsciencia?: string;
  reacaoManipulacao?: string;
}

export interface EstadoCorporalHidratacao {
  massaMuscular?: string;
  hidratacao?: string;
  turgorCutaneo?: string;
  edemaPeriferico?: string;
  pesoComparado?: string;
  escore?: number | string;
  peleElasticidade?: string;
  membranas?: string;
  tpc?: string;
  turgorPele?: string;
}

export interface NeurologicoBasico {
  nivelConsciencia?: string;
  posturaMarchaCoord?: string;
  propriocepcao?: string;
  nistagmoTremores?: string;
  respostaManipulacao?: string;
  observacoes?: string;
  reflexos?: string;
  marcha?: string;
}

export interface DorEComportamento {
  posturaCompativelDor?: string;
  alteracaoApetiteInteracao?: string;
  dorPalpacao?: string;
  marchaProtecao?: string;
  escalaDor?: number | string;
  localizacao?: string;
  tipoReacao?: string;
  alteracaoComportamento?: string;
}

export interface ChecklistFinalizacao {
  achadosRegistrados?: boolean;
  queixaCorrelacionada?: boolean;
  dorAvaliada?: boolean;
  examesDefinidos?: boolean;
  orientacoesRetorno?: boolean;
  prioridadeProximoPasso?: string;
  receitaEmitida?: boolean;
  examesSolicitados?: boolean;
  retronoMarcado?: boolean;
  tutorOrientado?: boolean;
  vacinasAtualizadas?: boolean;
  observacoes?: string;
}

export interface ConsultaAtendimento {
  id: string;
  pacienteId: string;
  tutorId: string;
  data: string;
  sintomasPrincipais: string;
  historicoClinico: string;
  exameFisico: Record<string, ExameFisicoItem>;
  parametrosVitais?: ParametrosVitais;
  peso: number;
  dieta: string;
  diagnostico?: string;
  conduta?: string;
  veterinarioNome?: string;
  isDomiciliar?: boolean;
  distanciaKm?: number;
  valorConsulta?: number;
  valorDeslocamento?: number;
  valorTotal?: number;
  criadoEm: string;
  // Campos de exame físico ampliado
  queixaPrincipalId?: string;
  observacaoAntesToque?: ObservacaoAntesToque;
  estadoCorporalHidratacao?: EstadoCorporalHidratacao;
  neurologicoBasico?: NeurologicoBasico;
  dorComportamento?: DorEComportamento;
  checklistFinalizacao?: ChecklistFinalizacao;
}

export const subscribeResponsaveis = (callback: (list: Responsavel[]) => void): (() => void) => {
  if (!db) { callback([]); return () => {}; }
  return onSnapshot(
    responsaveisCol(),
    snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Responsavel));
      list.sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
      callback(list);
    },
    err => {
      console.error('subscribeResponsaveis:', err.code, err.message);
      callback([]);
    }
  );
};

export const saveResponsavel = async (resp: Partial<Responsavel> & { id?: string }): Promise<string> => {
  if (!db) throw new Error('DB not initialized');
  const safeId = resp.id || `resp_${Date.now()}`;
  const data: Responsavel = {
    id: safeId,
    nomeCompleto: resp.nomeCompleto || '',
    cpf: resp.cpf || '',
    telefone: resp.telefone || '',
    email: resp.email || '',
    endereco: resp.endereco || '',
    criadoEm: resp.criadoEm || new Date().toISOString(),
    tenantId: APP_ID
  };
  await setDoc(doc(responsaveisCol(), safeId), data, { merge: true });
  return safeId;
};

export const deleteResponsavel = async (id: string): Promise<void> => {
  if (!db) return;
  await deleteDoc(doc(responsaveisCol(), id));
};

export const subscribePacientes = (callback: (list: Paciente[]) => void): (() => void) => {
  if (!db) { callback([]); return () => {}; }
  return onSnapshot(
    pacientesCol(),
    snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Paciente));
      list.sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
      callback(list);
    },
    err => {
      console.error('subscribePacientes:', err.code, err.message);
      callback([]);
    }
  );
};

export const savePaciente = async (paciente: Partial<Paciente> & { id?: string }): Promise<string> => {
  if (!db) throw new Error('DB not initialized');
  const safeId = paciente.id || `paciente_${Date.now()}`;
  const data: Paciente = {
    id: safeId,
    nome: paciente.nome || '',
    especie: paciente.especie || 'Canina',
    raca: paciente.raca || 'SRD',
    sexo: paciente.sexo || 'Macho',
    idade: paciente.idade || 0,
    peso: Number(paciente.peso) || 0,
    tutorId: paciente.tutorId || '',
    fotoUrl: paciente.fotoUrl || '',
    criadoEm: paciente.criadoEm || new Date().toISOString(),
    tenantId: APP_ID
  };
  if (paciente.obito !== undefined) {
    data.obito = !!paciente.obito;
    data.dataObito = paciente.obito ? paciente.dataObito || '' : '';
    data.causaObito = paciente.obito ? paciente.causaObito || '' : '';
  }
  await setDoc(doc(pacientesCol(), safeId), data, { merge: true });
  return safeId;
};

export const deletePaciente = async (id: string): Promise<void> => {
  if (!db) return;
  await deleteDoc(doc(pacientesCol(), id));
};

export const saveConsultaAtendimento = async (consulta: ConsultaAtendimento): Promise<string> => {
  if (!db) throw new Error('DB not initialized');
  const safeId = consulta.id || `cons_${Date.now()}`;
  await setDoc(doc(consultasClinicasCol(), safeId), {
    ...consulta,
    id: safeId
  }, { merge: true });
  return safeId;
};

// ─────────────────────────────────────────────────────────────────────────────
// ATENDIMENTO DOMICILIAR — CONFIG, MEDICAMENTOS APLICADOS, CHECKLIST RESÍDUOS
// ─────────────────────────────────────────────────────────────────────────────

export interface HomeCareConfig {
  ativo: boolean;
  enderecoBase: string;
  modeloPrecificacao: 'por_km' | 'faixas';
  valorPorKm?: number;
  taxaMinima?: number;
  faixas?: Array<{ ateKm: number; valor: number }>;
}

export const getHomeCareConfig = async (): Promise<HomeCareConfig | null> => {
  if (!db) return null;
  const snap = await getDoc(CFG_DOC('config', 'homecare'));
  return snap.exists() ? (snap.data() as HomeCareConfig) : null;
};

export const saveHomeCareConfig = async (data: HomeCareConfig): Promise<void> => {
  if (!db) return;
  await setDoc(CFG_DOC('config', 'homecare'), data, { merge: true });
};

// ── Medicamentos Aplicados ────────────────────────────────────────────────────

export interface MedicamentoAplicado {
  id: string;
  atendimentoId: string;
  farmaco: string;
  dose: string;
  viaAdministracao: string;
  horario: string;
  envolveSedacao: boolean;
  veterinarioNome?: string;
  criadoEm: string;
  tenantId?: string;
}

const medicamentosAplicadosCol = () => OP_COL('medicamentos_aplicados');

export const saveMedicamentoAplicado = async (
  med: Omit<MedicamentoAplicado, 'id' | 'criadoEm' | 'tenantId'>
): Promise<string> => {
  if (!db) throw new Error('DB not initialized');
  const id = `med_${Date.now()}`;
  const data: MedicamentoAplicado = {
    ...med,
    id,
    criadoEm: new Date().toISOString(),
    tenantId: APP_ID,
  };
  await setDoc(doc(medicamentosAplicadosCol(), id), data);
  return id;
};

export const subscribeMedicamentosAplicados = (
  atendimentoId: string,
  callback: (list: MedicamentoAplicado[]) => void
): (() => void) => {
  if (!db) { callback([]); return () => {}; }
  const q = query(medicamentosAplicadosCol(), where('atendimentoId', '==', atendimentoId));
  return onSnapshot(q, snap => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as MedicamentoAplicado));
    list.sort((a, b) => b.horario.localeCompare(a.horario));
    callback(list);
  }, err => {
    console.error('subscribeMedicamentosAplicados:', err);
    callback([]);
  });
};

export const subscribeAllMedicamentosAplicados = (
  callback: (list: MedicamentoAplicado[]) => void
): (() => void) => {
  if (!db) { callback([]); return () => {}; }
  return onSnapshot(medicamentosAplicadosCol(), snap => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as MedicamentoAplicado));
    list.sort((a, b) => (b.horario || '').localeCompare(a.horario || ''));
    callback(list);
  }, err => {
    console.error('subscribeAllMedicamentosAplicados:', err);
    callback([]);
  });
};

// ── Checklist de Resíduos PGRSS ───────────────────────────────────────────────

export interface GrupoResiduos {
  gerado: boolean;
  itens: string;
  segregacaoConfirmada: boolean;
}

export interface ChecklistResiduos {
  id: string;
  atendimentoId: string;
  grupoA: GrupoResiduos;
  grupoB: GrupoResiduos;
  grupoE: GrupoResiduos;
  residuosNoVeiculoConfirmado: boolean;
  destinoFinal: string;
  preenchidoPor: string;
  dataHora: string;
  tenantId?: string;
}

const checklistResiduosCol = () => OP_COL('checklist_residuos');

export const saveChecklistResiduos = async (
  data: Omit<ChecklistResiduos, 'id' | 'tenantId'>
): Promise<string> => {
  if (!db) throw new Error('DB not initialized');
  const id = `res_${Date.now()}`;
  const record: ChecklistResiduos = { ...data, id, tenantId: APP_ID };
  await setDoc(doc(checklistResiduosCol(), id), record);
  return id;
};

export const subscribeChecklistResiduos = (
  atendimentoId: string,
  callback: (list: ChecklistResiduos[]) => void
): (() => void) => {
  if (!db) { callback([]); return () => {}; }
  const q = query(checklistResiduosCol(), where('atendimentoId', '==', atendimentoId));
  return onSnapshot(q, snap => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChecklistResiduos));
    list.sort((a, b) => b.dataHora.localeCompare(a.dataHora));
    callback(list);
  }, err => {
    console.error('subscribeChecklistResiduos:', err);
    callback([]);
  });
};

export const subscribeAllChecklistResiduos = (
  callback: (list: ChecklistResiduos[]) => void
): (() => void) => {
  if (!db) { callback([]); return () => {}; }
  return onSnapshot(checklistResiduosCol(), snap => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChecklistResiduos));
    list.sort((a, b) => (b.dataHora || '').localeCompare(a.dataHora || ''));
    callback(list);
  }, err => {
    console.error('subscribeAllChecklistResiduos:', err);
    callback([]);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// CLOUD FUNCTIONS & ONBOARDING / RESOLUÇÃO DE TENANT
// ─────────────────────────────────────────────────────────────────────────────

export interface TenantLookupResult {
  found: boolean;
  count: number;
  defaultTenantId?: string | null;
  tenants?: Array<{ tenantId: string; role: string }>;
}

export const resolveTenantByEmail = async (email: string): Promise<TenantLookupResult> => {
  try {
    const callable = httpsCallable(functions, 'resolveTenantByEmail');
    const res = await callable({ email });
    return res.data as TenantLookupResult;
  } catch (error: any) {
    console.warn('Erro ou fallback ao resolver tenant via Cloud Function:', error);
    // Em caso de ambiente local/offline sem emulator functions, retorno fallback
    return { found: false, count: 0 };
  }
};

export interface RegisterClinicPayload {
  clinicName: string;
  ownerName: string;
  email: string;
  password: string;
  phone?: string;
  crmv?: string;
}

export const registerClinic = async (
  data: RegisterClinicPayload
): Promise<{ success: boolean; tenantId: string; uid: string }> => {
  const callable = httpsCallable(functions, 'registerNewClinic');
  const res = await callable(data);
  return res.data as { success: boolean; tenantId: string; uid: string };
};


// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES AUXILIARES: Paciente / Responsável (leitura única)
// ─────────────────────────────────────────────────────────────────────────────

export const getPaciente = async (id: string): Promise<Paciente | null> => {
  if (!db) return null;
  const snap = await getDoc(doc(pacientesCol(), id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Paciente) : null;
};

export const getResponsavel = async (id: string): Promise<Responsavel | null> => {
  if (!db || !id) return null;
  const col = TENANT_COL('responsaveis');
  const snap = await getDoc(doc(col, id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Responsavel) : null;
};

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO FINANCEIRO: Contas a Receber / Contas a Pagar / Categorias
// ─────────────────────────────────────────────────────────────────────────────

const contasReceberCol = (tenantId: string = getActiveTenantId()) =>
  TENANT_COL('contas_receber', tenantId);

const contasPagarCol = (tenantId: string = getActiveTenantId()) =>
  TENANT_COL('contas_pagar', tenantId);

const categoriasFinanceirasCol = (tenantId: string = getActiveTenantId()) =>
  TENANT_COL('categorias_financeiras', tenantId);

export interface ContaReceber {
  id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  dataVencimento?: string;
  status: 'pendente' | 'recebido' | 'pago' | 'atrasado' | 'cancelado';
  categoriaId?: string;
  categoriaNome?: string;
  clienteId?: string;
  clienteNome?: string;
  atendimentoId?: string;
  recebidoEm?: string;
  recebidoPor?: string;
  observacao?: string;
  observacoes?: string;
  criadoEm: string;
  criadoPor?: string;
  tenantId: string;
}

export interface ContaPagar {
  id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  dataVencimento?: string;
  status: 'pendente' | 'recebido' | 'pago' | 'atrasado' | 'cancelado';
  categoriaId?: string;
  categoriaNome?: string;
  fornecedor?: string;
  pagoEm?: string;
  pagoPor?: string;
  observacao?: string;
  observacoes?: string;
  criadoEm: string;
  criadoPor?: string;
  tenantId: string;
}

export interface CategoriaFinanceira {
  id: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  cor?: string;
  tenantId: string;
}

export const subscribeContasReceber = (
  callback: (list: ContaReceber[]) => void
): (() => void) => {
  const q = query(contasReceberCol(), orderBy('criadoEm', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ContaReceber)));
  });
};

export const subscribeContasPagar = (
  callback: (list: ContaPagar[]) => void
): (() => void) => {
  const q = query(contasPagarCol(), orderBy('criadoEm', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ContaPagar)));
  });
};

export const subscribeCategoriasFinanceiras = (
  callback: (list: CategoriaFinanceira[]) => void
): (() => void) => {
  return onSnapshot(categoriasFinanceirasCol(), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CategoriaFinanceira)));
  });
};

export const saveContaReceber = async (
  conta: Partial<ContaReceber> & { id?: string }
): Promise<string> => {
  if (!db) throw new Error('DB not initialized');
  const safeId = conta.id || `cr_${Date.now()}`;
  const data: ContaReceber = {
    descricao: conta.descricao || '',
    valor: conta.valor || 0,
    vencimento: conta.vencimento || conta.dataVencimento || new Date().toISOString().split('T')[0],
    dataVencimento: conta.dataVencimento || conta.vencimento || new Date().toISOString().split('T')[0],
    status: conta.status || 'pendente',
    criadoEm: conta.criadoEm || new Date().toISOString(),
    tenantId: getActiveTenantId(),
    ...conta,
    id: safeId,
  };
  await setDoc(doc(contasReceberCol(), safeId), data, { merge: true });
  return safeId;
};

export const deleteContaReceber = async (id: string): Promise<void> => {
  if (!db) return;
  await deleteDoc(doc(contasReceberCol(), id));
};

export const quitarContaReceber = async (
  conta: ContaReceber,
  dataRecebimento: string,
  recebidoPor: string
): Promise<void> => {
  if (!db) return;
  await updateDoc(doc(contasReceberCol(), conta.id), {
    status: 'recebido',
    recebidoEm: dataRecebimento,
    recebidoPor,
  });
};

export const saveContaPagar = async (
  conta: Partial<ContaPagar> & { id?: string }
): Promise<string> => {
  if (!db) throw new Error('DB not initialized');
  const safeId = conta.id || `cp_${Date.now()}`;
  const data: ContaPagar = {
    descricao: conta.descricao || '',
    valor: conta.valor || 0,
    vencimento: conta.vencimento || conta.dataVencimento || new Date().toISOString().split('T')[0],
    dataVencimento: conta.dataVencimento || conta.vencimento || new Date().toISOString().split('T')[0],
    status: conta.status || 'pendente',
    criadoEm: conta.criadoEm || new Date().toISOString(),
    tenantId: getActiveTenantId(),
    ...conta,
    id: safeId,
  };
  await setDoc(doc(contasPagarCol(), safeId), data, { merge: true });
  return safeId;
};

export const deleteContaPagar = async (id: string): Promise<void> => {
  if (!db) return;
  await deleteDoc(doc(contasPagarCol(), id));
};

export const quitarContaPagar = async (
  conta: ContaPagar,
  dataPagamento: string,
  pagoPor: string
): Promise<void> => {
  if (!db) return;
  await updateDoc(doc(contasPagarCol(), conta.id), {
    status: 'pago',
    pagoEm: dataPagamento,
    pagoPor,
  });
};

export const saveCategoriaFinanceira = async (
  cat: Partial<CategoriaFinanceira> & { id?: string }
): Promise<string> => {
  if (!db) throw new Error('DB not initialized');
  const safeId = cat.id || `catfin_${Date.now()}`;
  const data: CategoriaFinanceira = {
    nome: cat.nome || '',
    tipo: cat.tipo || 'receita',
    tenantId: getActiveTenantId(),
    ...cat,
    id: safeId,
  };
  await setDoc(doc(categoriasFinanceirasCol(), safeId), data, { merge: true });
  return safeId;
};

// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGO DE EXAMES & REQUISIÇÕES
// ─────────────────────────────────────────────────────────────────────────────

const catalogoExamesCol = (tenantId: string = getActiveTenantId()) =>
  TENANT_COL('catalogo_exames', tenantId);

const requisicoesExamesCol = (tenantId: string = getActiveTenantId()) =>
  TENANT_COL('requisicoes_exames', tenantId);

export interface CatalogoExame {
  id: string;
  nome: string;
  grupo?: string;        // e.g. "Hematologia", "Bioquímica", "Imagem"
  categoria: string;    // categoria principal
  descricao?: string;
  referencia?: string;
  preparo?: string;
  tipoAmostra?: string;
  laboratorioReferencia?: string;
  ativo?: boolean;
  tenantId: string;
}

export interface RequisicaoExame {
  id: string;
  pacienteId: string;
  atendimentoId?: string;
  tipo: 'requisicao_exames';
  indicacaoClinica: string;
  exames?: string[];    // ids dos exames solicitados
  examesSelecionados?: any[];
  status?: 'pendente' | 'realizado' | 'cancelado';
  criadoEm: string;
  criadoPor: string;
  pdfUrl?: string;
  tenantId?: string;
}

export const subscribeCatalogoExames = (
  callback: (list: CatalogoExame[]) => void
): (() => void) => {
  const q = query(catalogoExamesCol(), orderBy('grupo'), orderBy('nome'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CatalogoExame)));
  });
};

export const saveCatalogoExame = async (
  exame: Partial<CatalogoExame> & { id?: string }
): Promise<string> => {
  if (!db) throw new Error('DB not initialized');
  const safeId = exame.id || `catex_${Date.now()}`;
  const data: CatalogoExame = {
    nome: exame.nome || '',
    grupo: exame.grupo || exame.categoria || 'Geral',
    categoria: exame.categoria || exame.grupo || 'Geral',
    tenantId: getActiveTenantId(),
    ...exame,
    id: safeId,
  };
  await setDoc(doc(catalogoExamesCol(), safeId), data, { merge: true });
  return safeId;
};

export const deleteCatalogoExame = async (id: string): Promise<void> => {
  if (!db) return;
  await deleteDoc(doc(catalogoExamesCol(), id));
};

export const saveRequisicaoExame = async (
  req: Partial<RequisicaoExame> & { id?: string }
): Promise<string> => {
  if (!db) throw new Error('DB not initialized');
  const safeId = req.id || `reqex_${Date.now()}`;
  const data = {
    tipo: 'requisicao_exames' as const,
    indicacaoClinica: req.indicacaoClinica || '',
    criadoEm: req.criadoEm || new Date().toISOString(),
    criadoPor: req.criadoPor || '',
    tenantId: getActiveTenantId(),
    ...req,
    id: safeId,
  };
  await setDoc(doc(requisicoesExamesCol(), safeId), data, { merge: true });
  return safeId;
};

export const subscribeRequisicoesExames = (
  pacienteId: string,
  callback: (list: RequisicaoExame[]) => void
): (() => void) => {
  if (!db || !pacienteId) { callback([]); return () => {}; }
  const q = query(requisicoesExamesCol(), where('pacienteId', '==', pacienteId), orderBy('criadoEm', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RequisicaoExame)));
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// EVOLUÇÕES CLÍNICAS (Timeline do Paciente)
// ─────────────────────────────────────────────────────────────────────────────

const evolucoesCol = (pacienteId: string, tenantId: string = getActiveTenantId()) =>
  collection(db!, 'clinicas', tenantId, 'pacientes', pacienteId, 'evolucoes');

export interface PlanoDiagnosticoItem {
  id?: string;
  exameProcedimento: string;
  justificativa: string;
}

export interface CondutaTratamentoItem {
  id?: string;
  medicacaoProcedimento: string;
  doseViaFreq: string;
  duracao: string;
}

export interface EvolucaoCaso {
  id: string;
  pacienteId: string;
  tutorId?: string;
  atendimentoId?: string;
  casoId?: string;
  consultaReferenciaId?: string;
  data: string;
  texto: string;
  planoDiagnostico?: PlanoDiagnosticoItem[];
  tratamentosInstituidos?: CondutaTratamentoItem[];
  condutaAjustada?: string;
  registradoPor?: string;
  autorNome?: string;
  autorId?: string;
  examesReferenciados?: string[];
  criadoEm?: string;
  tenantId: string;
}

export const subscribeEvolucoesPaciente = (
  pacienteId: string,
  callback: (list: EvolucaoCaso[]) => void
): (() => void) => {
  if (!db || !pacienteId) { callback([]); return () => {}; }
  const q = query(evolucoesCol(pacienteId), orderBy('data', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EvolucaoCaso)));
  });
};

export const saveEvolucaoCaso = async (
  pacienteIdOrData: string | (Partial<EvolucaoCaso> & { id?: string }),
  evolucaoData?: Partial<EvolucaoCaso> & { id?: string }
): Promise<string> => {
  if (!db) throw new Error('DB not initialized');
  let pacienteId: string;
  let evolucao: Partial<EvolucaoCaso> & { id?: string };
  if (typeof pacienteIdOrData === 'string') {
    pacienteId = pacienteIdOrData;
    evolucao = evolucaoData || {};
  } else {
    evolucao = pacienteIdOrData;
    pacienteId = evolucao.pacienteId || '';
  }
  const safeId = evolucao.id || `ev_${Date.now()}`;
  const data: EvolucaoCaso = {
    pacienteId,
    data: evolucao.data || new Date().toISOString(),
    texto: evolucao.texto || '',
    tenantId: getActiveTenantId(),
    ...evolucao,
    id: safeId,
  };
  await setDoc(doc(evolucoesCol(pacienteId), safeId), data, { merge: true });
  return safeId;
};

// ─────────────────────────────────────────────────────────────────────────────
// ROTEIROS DE ANAMNESE
// ─────────────────────────────────────────────────────────────────────────────

// Re-export do tipo do seed (evita duplicação)
export interface RoteiroAnamnese {
  id: string;
  ordem: number;
  nome: string;
  semiologia?: string;
  secoes: { titulo: string; campos: any[] }[];
  naoEsqueca: string[];
  objetivo: string;
  tenantId?: string;
}

const roteirosAnamneseCol = (tenantId: string = getActiveTenantId()) =>
  TENANT_COL('roteiros_anamnese', tenantId);

export const subscribeRoteirosAnamnese = (
  callback: (list: any[]) => void
): (() => void) => {
  const q = query(roteirosAnamneseCol(), orderBy('ordem'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const saveRoteiroAnamnese = async (roteiro: any): Promise<string> => {
  if (!db) throw new Error('DB not initialized');
  const safeId = roteiro.id || `rot_${Date.now()}`;
  await setDoc(doc(roteirosAnamneseCol(), safeId), { ...roteiro, id: safeId }, { merge: true });
  return safeId;
};
