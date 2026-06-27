import { BankTransaction } from './statementParsers';
import { 
  ReconciliationConfig, 
  ReconciliationItem, 
  ValidationResult,
  IntegrityCheck
} from '../services/reconciliationService';

// The local CashMovement interface representing data from /caixa/{date}
export interface CashMovement {
  _id: string; // the original ID in the caixa array
  tipo: 'entrada' | 'saida';
  valor: string; // stored as string "150"
  descricao: string;
  date: string; // injected during fetch
  documentNumber?: string;
  // For matching, we infer paymentMethod from descricao if not explicitly set
}

const inferPaymentMethod = (desc: string): keyof ReconciliationConfig['cardRates'] => {
  const d = desc.toLowerCase();
  if (d.includes('pix')) return 'pix';
  if (d.includes('débito') || d.includes('debito')) return 'debit';
  if (d.includes('crédito') || d.includes('credito')) {
    if (d.includes('parcelado')) return 'creditInstallment';
    return 'creditCash';
  }
  return 'debit';
};

const generateId = () => Math.random().toString(36).substr(2, 9);

// ─────────────────────────────────────────────────────
// FASE 1 — Validação (antes de qualquer cruzamento)
// ─────────────────────────────────────────────────────
export const validateBases = (
  bankItems: BankTransaction[],
  clinicItems: CashMovement[],
  config: ReconciliationConfig
): ValidationResult => {

  if (bankItems.length === 0) {
    return { 
      valid: false, 
      stopReason: 'O extrato bancário não contém transações.',
      bankTotal: 0, clinicTotal: 0, clinicNetTotal: 0,
      bankCount: 0, clinicCount: 0,
      period: { start: '', end: '' },
      globalDifference: 0
    };
  }
  if (clinicItems.length === 0) {
    return { 
      valid: false, 
      stopReason: 'Nenhum lançamento de Caixa encontrado para este período.',
      bankTotal: 0, clinicTotal: 0, clinicNetTotal: 0,
      bankCount: bankItems.length, clinicCount: 0,
      period: { start: '', end: '' },
      globalDifference: 0
    };
  }

  const bankDates = bankItems.map(i => i.date).sort();
  const clinicDates = clinicItems.map(i => i.date).sort();
  const bankStart = bankDates[0];
  const bankEnd = bankDates[bankDates.length - 1];
  const clinicStart = clinicDates[0];
  const clinicEnd = clinicDates[clinicDates.length - 1];

  if (bankEnd < clinicStart || clinicEnd < bankStart) {
    return {
      valid: false,
      stopReason: `Os períodos não coincidem. Banco: ${bankStart} a ${bankEnd}. Caixa: ${clinicStart} a ${clinicEnd}.`,
      bankTotal: 0, clinicTotal: 0, clinicNetTotal: 0,
      bankCount: bankItems.length, clinicCount: clinicItems.length,
      period: { start: bankStart, end: bankEnd },
      globalDifference: 0
    };
  }

  const bankTotal = bankItems.reduce((s, i) => s + i.amount, 0);
  const clinicTotal = clinicItems.reduce((s, i) => s + (parseFloat(i.valor) || 0), 0);

  const clinicNetTotal = clinicItems.reduce((s, i) => {
    const amount = parseFloat(i.valor) || 0;
    const method = inferPaymentMethod(i.descricao);
    const rate = config.cardRates[method] || 0;
    return s + (amount * (1 - rate / 100));
  }, 0);

  const globalDifference = bankTotal - clinicNetTotal;

  return {
    valid: true,
    bankTotal,
    clinicTotal,
    clinicNetTotal,
    bankCount: bankItems.length,
    clinicCount: clinicItems.length,
    period: {
      start: bankStart < clinicStart ? bankStart : clinicStart,
      end: bankEnd > clinicEnd ? bankEnd : clinicEnd,
    },
    globalDifference,
  };
};

// ─────────────────────────────────────────────────────
// FASE 2 — CRUZAMENTO EM 6 CAMADAS PROGRESSIVAS
// ─────────────────────────────────────────────────────
export const autoMatch = (
  bankItems: BankTransaction[],
  clinicItems: CashMovement[],
  config: ReconciliationConfig,
  _validation: ValidationResult,
  reconciliationId: string
): ReconciliationItem[] => {

  const results: ReconciliationItem[] = [];
  const usedBankIds = new Set<string>();
  const usedClinicIds = new Set<string>();

  const getNetAmount = (item: CashMovement): { net: number, amount: number, method: string } => {
    const amount = parseFloat(item.valor) || 0;
    const method = inferPaymentMethod(item.descricao);
    const rate = config.cardRates[method] || 0;
    return { net: Math.abs(amount) * (1 - rate / 100), amount, method };
  };

  const daysDiff = (a: string, b: string): number =>
    Math.abs((new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime()) / (1000 * 60 * 60 * 24));

  const pushMatch = (clinicItem: CashMovement, bankItem: BankTransaction, layer: 0|1|2|3|4|5|6, status: ReconciliationItem['status'], confidence: number, diffAmount: number, diffReason?: ReconciliationItem['differenceReason']) => {
    const { net, amount, method } = getNetAmount(clinicItem);
    results.push({
      id: `ri_${generateId()}`,
      reconciliationId,
      bank: { date: bankItem.date, amount: bankItem.amount, description: bankItem.description, balance: bankItem.balance },
      clinic: { date: clinicItem.date, amount, netAmount: net, description: clinicItem.descricao, paymentMethod: method, cashMovementId: clinicItem._id },
      status,
      matchLayer: layer,
      matchConfidence: confidence,
      differenceAmount: diffAmount,
      differenceReason: diffReason
    });
  };

  // CAMADA 1 — Chave + Valor Exato
  for (const clinicItem of clinicItems) {
    if (usedClinicIds.has(clinicItem._id)) continue;
    const { net: expectedNet } = getNetAmount(clinicItem);

    for (const bankItem of bankItems) {
      if (usedBankIds.has(bankItem.id)) continue;
      const bankAbs = Math.abs(bankItem.amount);
      const sameDoc = clinicItem.documentNumber && bankItem.description.includes(clinicItem.documentNumber);
      const sameValue = Math.abs(bankAbs - expectedNet) <= config.amountTolerance;

      if (sameDoc && sameValue) {
        pushMatch(clinicItem, bankItem, 1, 'matched', 100, bankAbs - expectedNet);
        usedBankIds.add(bankItem.id);
        usedClinicIds.add(clinicItem._id);
        break;
      }
    }
  }

  // CAMADA 2 — Chave no Texto do Histórico (Doc/referência na descrição do extrato)
  for (const clinicItem of clinicItems) {
    if (usedClinicIds.has(clinicItem._id)) continue;
    if (!clinicItem.documentNumber) continue;

    for (const bankItem of bankItems) {
      if (usedBankIds.has(bankItem.id)) continue;

      const keyInDesc = bankItem.description.toUpperCase().includes(clinicItem.documentNumber.toUpperCase());
      const dateOk = daysDiff(clinicItem.date, bankItem.date) <= config.dateTolerance;

      if (keyInDesc && dateOk) {
        const { net: expectedNet } = getNetAmount(clinicItem);
        const bankAbs = Math.abs(bankItem.amount);
        const diff = bankAbs - expectedNet;
        
        pushMatch(clinicItem, bankItem, 2, Math.abs(diff) <= config.amountTolerance ? 'matched' : 'divergent', 90, diff, Math.abs(diff) > config.amountTolerance ? 'key_match_value_diff' : undefined);
        usedBankIds.add(bankItem.id);
        usedClinicIds.add(clinicItem._id);
        break;
      }
    }
  }

  // CAMADA 3 — Lote (N lançamentos da Caixa = 1 do extrato)
  const remainingClinic = clinicItems.filter(i => !usedClinicIds.has(i._id));
  const remainingBank = bankItems.filter(i => !usedBankIds.has(i.id));

  for (const bankItem of remainingBank) {
    if (usedBankIds.has(bankItem.id)) continue;
    const bankAbs = Math.abs(bankItem.amount);

    const candidates = remainingClinic.filter(i => !usedClinicIds.has(i._id) && daysDiff(i.date, bankItem.date) <= config.dateTolerance);

    for (let a = 0; a < candidates.length; a++) {
      for (let b = a + 1; b < candidates.length; b++) {
        const sumNet = getNetAmount(candidates[a]).net + getNetAmount(candidates[b]).net;
        if (Math.abs(sumNet - bankAbs) <= config.amountTolerance) {
          [candidates[a], candidates[b]].forEach(item => {
            pushMatch(item, bankItem, 3, 'matched', 80, 0, 'batch_match');
            usedClinicIds.add(item._id);
          });
          usedBankIds.add(bankItem.id);
          break;
        }
      }
      if (usedBankIds.has(bankItem.id)) break;
    }
  }

  // CAMADA 4 — Chave + Valor Diferente (tolerância + R$ 0,10 arredondamento)
  for (const clinicItem of clinicItems) {
    if (usedClinicIds.has(clinicItem._id)) continue;
    if (!clinicItem.documentNumber) continue;

    for (const bankItem of bankItems) {
      if (usedBankIds.has(bankItem.id)) continue;

      const keyInDesc = bankItem.description.toUpperCase().includes(clinicItem.documentNumber.toUpperCase());
      const { net: expectedNet } = getNetAmount(clinicItem);
      const bankAbs = Math.abs(bankItem.amount);
      const diff = Math.abs(bankAbs - expectedNet);

      if (keyInDesc && diff <= (config.amountTolerance + 0.10)) {
        pushMatch(clinicItem, bankItem, 4, 'divergent', 75, bankAbs - expectedNet, 'rounding_difference');
        usedBankIds.add(bankItem.id);
        usedClinicIds.add(clinicItem._id);
        break;
      }
    }
  }

  // CAMADA 5 — Valor + Data (sem chave)
  for (const clinicItem of clinicItems) {
    if (usedClinicIds.has(clinicItem._id)) continue;
    const { net: expectedNet } = getNetAmount(clinicItem);

    for (const bankItem of bankItems) {
      if (usedBankIds.has(bankItem.id)) continue;

      const bankAbs = Math.abs(bankItem.amount);
      const valueDiff = Math.abs(bankAbs - expectedNet);
      const dateOk = daysDiff(clinicItem.date, bankItem.date) <= config.dateTolerance;
      const maxDiff = expectedNet * 0.05;

      if (valueDiff <= maxDiff && dateOk) {
        pushMatch(clinicItem, bankItem, 5, valueDiff <= config.amountTolerance ? 'matched' : 'divergent', 65, bankAbs - expectedNet, valueDiff > config.amountTolerance ? 'card_fee' : undefined);
        usedBankIds.add(bankItem.id);
        usedClinicIds.add(clinicItem._id);
        break;
      }
    }
  }

  // CAMADA 6 — Fuzzy (histórico parecido)
  const normalize = (s: string): string =>
    s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9 ]/g, '').trim();

  const similarity = (a: string, b: string): number => {
    const na = normalize(a);
    const nb = normalize(b);
    const wordsA = na.split(' ').filter(Boolean);
    const wordsB = new Set(nb.split(' ').filter(Boolean));
    const matches = wordsA.filter(w => wordsB.has(w)).length;
    if (Math.max(wordsA.length, wordsB.size) === 0) return 0;
    return matches / Math.max(wordsA.length, wordsB.size);
  };

  for (const clinicItem of clinicItems) {
    if (usedClinicIds.has(clinicItem._id)) continue;
    const { net: expectedNet } = getNetAmount(clinicItem);

    let bestMatch: BankTransaction | null = null;
    let bestScore = 0;

    for (const bankItem of bankItems) {
      if (usedBankIds.has(bankItem.id)) continue;

      const dateOk = daysDiff(clinicItem.date, bankItem.date) <= config.dateTolerance;
      if (!dateOk) continue;

      const bankAbs = Math.abs(bankItem.amount);
      const valueDiff = Math.abs(bankAbs - expectedNet);
      const maxDiff = expectedNet * 0.05;
      if (valueDiff > maxDiff) continue;

      const sim = similarity(clinicItem.descricao || '', bankItem.description || '');

      if (sim > 0.4 && sim > bestScore) {
        bestScore = sim;
        bestMatch = bankItem;
      }
    }

    if (bestMatch) {
      const bankAbs = Math.abs(bestMatch.amount);
      pushMatch(clinicItem, bestMatch, 6, 'divergent', Math.round(bestScore * 60), bankAbs - expectedNet, 'fuzzy_match');
      usedBankIds.add(bestMatch.id);
      usedClinicIds.add(clinicItem._id);
    }
  }

  // ITENS SEM MATCH — pendentes para revisão manual
  for (const bankItem of bankItems) {
    if (!usedBankIds.has(bankItem.id)) {
      results.push({
        id: `ri_${generateId()}`,
        reconciliationId,
        bank: { date: bankItem.date, amount: bankItem.amount, description: bankItem.description, balance: bankItem.balance },
        status: 'bank_only',
        matchLayer: 0,
        matchConfidence: 0
      });
    }
  }
  for (const clinicItem of clinicItems) {
    if (!usedClinicIds.has(clinicItem._id)) {
      const { net, amount, method } = getNetAmount(clinicItem);
      results.push({
        id: `ri_${generateId()}`,
        reconciliationId,
        clinic: { date: clinicItem.date, amount, netAmount: net, description: clinicItem.descricao, paymentMethod: method, cashMovementId: clinicItem._id },
        status: 'clinic_only',
        matchLayer: 0,
        matchConfidence: 0
      });
    }
  }

  return results;
};

// ─────────────────────────────────────────────────────
// FASE 3 — CHECKPOINT DE INTEGRIDADE
// ─────────────────────────────────────────────────────
export const checkIntegrity = (
  results: ReconciliationItem[],
  validation: ValidationResult,
  _config: ReconciliationConfig
): IntegrityCheck => {

  const pendingBankTotal = results
    .filter(r => r.status === 'bank_only' && r.bank)
    .reduce((s, r) => s + Math.abs(r.bank!.amount), 0);

  const pendingClinicTotal = results
    .filter(r => r.status === 'clinic_only' && r.clinic)
    .reduce((s, r) => s + r.clinic!.netAmount, 0);

  const divergenceTotal = results
    .filter(r => r.status === 'divergent' || (r.status as string) === 'matched_manual')
    .reduce((s, r) => s + (r.differenceAmount || 0), 0);

  // Composição: pendências do banco - pendências da caixa + divergências = diferença global esperada
  const compositionTotal = pendingBankTotal - pendingClinicTotal + divergenceTotal;
  const compositionDifference = Math.abs(compositionTotal - validation.globalDifference);

  // Tolerância de R$ 0,50 para arredondamentos e imprecisões no floating point
  const passed = compositionDifference <= 0.50;

  return {
    passed,
    stopReason: passed
      ? undefined
      : `Prova de Integridade falhou. A composição (R$ ${compositionTotal.toFixed(2)}) não reflete a diferença global (R$ ${validation.globalDifference.toFixed(2)}). Diferença inexplicada: R$ ${compositionDifference.toFixed(2)}.`,
    pendingBankTotal,
    pendingClinicTotal,
    divergenceTotal,
    compositionTotal,
    globalDifference: validation.globalDifference,
    compositionDifference,
  };
};
