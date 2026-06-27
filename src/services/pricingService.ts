import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  getDoc,
  Timestamp,
} from 'firebase/firestore';

const APP_ID = import.meta.env.VITE_APP_TENANT_ID || 'clinicos_demo';

// Helpers para caminhos
const CFG_DOC = (col: string, id: string) => doc(db!, 'bea_data', APP_ID, col, id);

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS E INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface StaffCost {
  id: string;
  name: string;
  role: string;
  monthlyCost: number;       // salário + encargos totais
  type: 'fixed' | 'clinical' | 'prolabore';
  hoursPerMonth: number;     // horas trabalhadas por mês
  costPerHour?: number;      // calculado: monthlyCost / hoursPerMonth
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  category: 'facility' | 'utilities' | 'software' | 'marketing' | 'other';
}

export interface PricingConfig {
  staff: StaffCost[];
  fixedExpenses: FixedExpense[];
  taxRate: number;
  cardRates: {
    debit: number;
    creditCash: number;
    creditInstallment: number;
    pix: number;
  };
  paymentMix: {
    debit: number;
    creditCash: number;
    creditInstallment: number;
    pix: number;
  };
  monthlyWorkingDays: number;
  dailyWorkingHours: number;
  updatedAt?: string | Timestamp;
}

export interface SupplyItem {
  name: string;
  unitCost: number;
  quantity: number;
  unit: string;
}

export interface ServicePricingInput {
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  supplies: SupplyItem[];
  clinicalStaffId: string;
  biologicalRisk: 'low' | 'medium' | 'high' | 'very_high';
  targetMargin: number;
  updatedAt?: string | Timestamp;
}

export interface PricingResult {
  suppliesCost: number;
  laborCost: number;
  fixedCostShare: number;
  subtotalCost: number;
  effectiveCardRate: number;
  taxRate: number;
  totalDeductions: number;
  biologicalRiskPremium: number;
  minimumPrice: number;
  suggestedPrice: number;
  maximumPrice: number;
  contributionMargin: number;
  breakEvenUnits: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR DE CÁLCULO
// ─────────────────────────────────────────────────────────────────────────────

const BIOLOGICAL_RISK_PREMIUM = {
  low: 0,
  medium: 10,
  high: 25,
  very_high: 40,
};

export const calculateServicePrice = (
  input: ServicePricingInput,
  config: PricingConfig
): PricingResult => {
  // 1. Custo de insumos
  const suppliesCost = input.supplies.reduce(
    (sum, s) => sum + (s.unitCost * s.quantity), 0
  );

  // 2. Custo de mão de obra clínica
  const clinician = config.staff.find(s => s.id === input.clinicalStaffId);
  const costPerMinute = clinician && clinician.hoursPerMonth > 0
    ? (clinician.monthlyCost / clinician.hoursPerMonth) / 60
    : 0;
  const laborCost = costPerMinute * input.durationMinutes;

  // 3. Rateio de despesas fixas
  const totalFixedMonthly = config.fixedExpenses.reduce(
    (sum, e) => sum + e.amount, 0
  );
  const totalFixedStaff = config.staff
    .filter(s => s.type === 'fixed')
    .reduce((sum, s) => sum + s.monthlyCost, 0);
  
  const totalFixed = totalFixedMonthly + totalFixedStaff;
  
  const totalMonthlyMinutes = config.monthlyWorkingDays * config.dailyWorkingHours * 60;
  
  const fixedCostShare = totalMonthlyMinutes > 0 
    ? (totalFixed / totalMonthlyMinutes) * input.durationMinutes
    : 0;

  // 4. Custo total base
  const subtotalCost = suppliesCost + laborCost + fixedCostShare;

  // 5. Deduções sobre o preço (calculadas por dentro)
  const effectiveCardRate = (
    (config.cardRates.debit * config.paymentMix.debit) +
    (config.cardRates.creditCash * config.paymentMix.creditCash) +
    (config.cardRates.creditInstallment * config.paymentMix.creditInstallment) +
    (config.cardRates.pix * config.paymentMix.pix)
  ) / 100;
  
  const totalDeductions = config.taxRate / 100 + effectiveCardRate / 100;

  // Se deduções passarem de 100%, o cálculo se quebra (divisão por negativo). Evitar isso:
  const safeDeductions = Math.min(totalDeductions, 0.99);
  const safeMargin = Math.min(input.targetMargin / 100, 0.99 - safeDeductions);

  // 6. Preço mínimo (sem lucro, só cobre custos)
  const minimumPrice = subtotalCost / (1 - safeDeductions);

  // 7. Preço sugerido (com margem desejada)
  const suggestedPrice = subtotalCost / (1 - safeDeductions - safeMargin);

  // 8. Prêmio de risco biológico
  const riskPremium = BIOLOGICAL_RISK_PREMIUM[input.biologicalRisk] || 0;
  const maximumPrice = suggestedPrice * (1 + riskPremium / 100);

  // 9. Margem de contribuição real ao preço sugerido
  const contributionMargin = suggestedPrice > 0 
    ? ((suggestedPrice - subtotalCost) / suggestedPrice) * 100 
    : 0;

  // 10. Ponto de equilíbrio deste serviço
  const unitContribution = suggestedPrice - suppliesCost - laborCost;
  const breakEvenUnits = unitContribution > 0 ? Math.ceil(totalFixed / unitContribution) : 0;

  return {
    suppliesCost,
    laborCost,
    fixedCostShare,
    subtotalCost,
    effectiveCardRate,
    taxRate: config.taxRate,
    totalDeductions: totalDeductions * 100,
    biologicalRiskPremium: riskPremium,
    minimumPrice,
    suggestedPrice,
    maximumPrice,
    contributionMargin,
    breakEvenUnits,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// FIREBASE FIRESTORE API
// ─────────────────────────────────────────────────────────────────────────────

export const defaultPricingConfig: PricingConfig = {
  staff: [],
  fixedExpenses: [],
  taxRate: 6,
  cardRates: { debit: 1.5, creditCash: 2.5, creditInstallment: 3.5, pix: 0 },
  paymentMix: { debit: 20, creditCash: 30, creditInstallment: 30, pix: 20 },
  monthlyWorkingDays: 22,
  dailyWorkingHours: 8,
};

export const savePricingConfig = async (config: PricingConfig): Promise<void> => {
  if (!db) return;
  // Calculate costPerHour for staff before saving
  const configToSave = {
    ...config,
    staff: config.staff.map(s => ({
      ...s,
      costPerHour: s.hoursPerMonth > 0 ? s.monthlyCost / s.hoursPerMonth : 0
    })),
    updatedAt: new Date().toISOString()
  };
  await setDoc(CFG_DOC('pricing', 'config'), configToSave, { merge: true });
};

export const subscribePricingConfig = (callback: (config: PricingConfig) => void): (() => void) => {
  if (!db) { callback(defaultPricingConfig); return () => {}; }
  return onSnapshot(
    CFG_DOC('pricing', 'config'),
    snap => {
      if (snap.exists()) {
        callback(snap.data() as PricingConfig);
      } else {
        callback(defaultPricingConfig);
      }
    },
    err => { console.error('subscribePricingConfig:', err); callback(defaultPricingConfig); }
  );
};

export const getPricingConfig = async (): Promise<PricingConfig> => {
  if (!db) return defaultPricingConfig;
  const snap = await getDoc(CFG_DOC('pricing', 'config'));
  return snap.exists() ? (snap.data() as PricingConfig) : defaultPricingConfig;
};

// --- Services Pricing ---

export const saveServicePricing = async (pricing: ServicePricingInput & { result: PricingResult }): Promise<void> => {
  if (!db) return;
  const pricingData = {
    ...pricing,
    updatedAt: new Date().toISOString()
  };
  await setDoc(doc(db, 'bea_data', APP_ID, 'pricing_services', pricing.serviceId), pricingData, { merge: true });
};

export const subscribeServicePricingList = (callback: (pricings: (ServicePricingInput & { result: PricingResult })[]) => void): (() => void) => {
  if (!db) { callback([]); return () => {}; }
  return onSnapshot(
    collection(db, 'bea_data', APP_ID, 'pricing_services'),
    snap => {
      const list = snap.docs.map(d => d.data() as (ServicePricingInput & { result: PricingResult }));
      callback(list);
    },
    err => { console.error('subscribeServicePricingList:', err); callback([]); }
  );
};
