import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
  writeBatch,
  orderBy
} from 'firebase/firestore';

const APP_ID = import.meta.env.VITE_APP_TENANT_ID || 'clinicos_demo';

// Types
export interface ValidationResult {
  valid: boolean;
  stopReason?: string;
  bankTotal: number;
  clinicTotal: number;
  clinicNetTotal: number;
  bankCount: number;
  clinicCount: number;
  period: { start: string; end: string };
  globalDifference: number;
}

export interface IntegrityCheck {
  passed: boolean;
  stopReason?: string;
  pendingBankTotal: number;
  pendingClinicTotal: number;
  divergenceTotal: number;
  compositionTotal: number;
  globalDifference: number;
  compositionDifference: number;
}

export interface Reconciliation {
  id: string;
  period: { start: string; end: string };
  bankName: string;
  importedAt: string | Timestamp;
  status: 'pending' | 'in_progress' | 'completed';
  importFormat: 'pdf' | 'csv' | 'ofx';
  validation?: ValidationResult;
  integrity?: IntegrityCheck;
  summary: {
    bankTotal: number;
    clinicTotal: number;
    difference: number;
    matchedCount: number;
    divergentCount: number;
    unreconciledBank: number;
    unreconciledClinic: number;
  };
}

export interface ReconciliationItem {
  id: string;
  reconciliationId: string;
  bank?: {
    date: string;
    amount: number;
    description: string;
    balance?: number;
  };
  clinic?: {
    date: string;
    amount: number;
    netAmount: number;
    description: string;
    paymentMethod: string;
    cashMovementId: string;
  };
  status: 'matched' | 'matched_manual' | 'divergent' | 'bank_only' | 'clinic_only' | 'ignored';
  matchLayer: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = sem match
  matchConfidence: number;
  differenceAmount?: number;
  differenceReason?: 'card_fee' | 'anticipation' | 'rounding_difference' | 'key_match_value_diff' | 'batch_match' | 'fuzzy_match' | 'manual';
  notes?: string;
}

export interface ReconciliationConfig {
  cardRates: {
    debit: number;
    creditCash: number;
    creditInstallment: number;
    pix: number;
  };
  anticipationRate: number; // monthly
  dateTolerance: number; // days
  amountTolerance: number; // absolute value
}

// Default config
export const DEFAULT_RATES: ReconciliationConfig = {
  cardRates: { debit: 1.5, creditCash: 2.5, creditInstallment: 3.5, pix: 0 },
  anticipationRate: 2.2,
  dateTolerance: 3,
  amountTolerance: 0.10,
};

// API Functions
export const getReconciliationConfig = async (): Promise<ReconciliationConfig> => {
  if (!db) return DEFAULT_RATES;
  
  try {
    // Check local config first
    const localSnap = await getDoc(doc(db, 'bea_data', APP_ID, 'reconciliation', 'config'));
    if (localSnap.exists()) {
      return localSnap.data() as ReconciliationConfig;
    }

    // Fallback to pricing config
    const pricingSnap = await getDoc(doc(db, 'bea_data', APP_ID, 'pricing', 'config'));
    if (pricingSnap.exists()) {
      const data = pricingSnap.data();
      return {
        ...DEFAULT_RATES,
        cardRates: data.cardRates || DEFAULT_RATES.cardRates
      };
    }
  } catch (e) {
    console.error('Error fetching config:', e);
  }

  return DEFAULT_RATES;
};

export const saveReconciliationConfig = async (config: ReconciliationConfig) => {
  if (!db) return;
  await setDoc(doc(db, 'bea_data', APP_ID, 'reconciliation', 'config'), config);
};

export const fetchReconciliations = async (): Promise<Reconciliation[]> => {
  if (!db) return [];
  const q = query(
    collection(db, 'artifacts', APP_ID, 'public', 'data', 'reconciliations'),
    orderBy('importedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as Reconciliation);
};

export const fetchReconciliationDetails = async (id: string): Promise<{
  reconciliation: Reconciliation;
  items: ReconciliationItem[];
} | null> => {
  if (!db) return null;
  const recSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'reconciliations', id));
  if (!recSnap.exists()) return null;

  const itemsQ = query(
    collection(db, 'artifacts', APP_ID, 'public', 'data', 'reconciliation_items'),
    where('reconciliationId', '==', id)
  );
  const itemsSnap = await getDocs(itemsQ);
  
  return {
    reconciliation: recSnap.data() as Reconciliation,
    items: itemsSnap.docs.map(d => d.data() as ReconciliationItem)
  };
};

export const saveReconciliationData = async (
  reconciliation: Reconciliation,
  items: ReconciliationItem[]
) => {
  if (!db) return;
  const batch = writeBatch(db);

  // Save main record
  batch.set(
    doc(db, 'artifacts', APP_ID, 'public', 'data', 'reconciliations', reconciliation.id),
    reconciliation
  );

  // Save all items
  for (const item of items) {
    batch.set(
      doc(db, 'artifacts', APP_ID, 'public', 'data', 'reconciliation_items', item.id),
      item
    );
  }

  await batch.commit();
};

export const updateReconciliationItem = async (
  itemId: string,
  updates: Partial<ReconciliationItem>
) => {
  if (!db) return;
  await setDoc(
    doc(db, 'artifacts', APP_ID, 'public', 'data', 'reconciliation_items', itemId),
    updates,
    { merge: true }
  );
};

export const fetchCashMovements = async (startDate: string, endDate: string) => {
  if (!db) return [];
  // The daily cash is stored in `bea_data/{tenantId}/caixa/{date}`
  // We need to fetch the range of days.
  // We will generate the list of dates in the range and fetch them all.
  
  const movements: any[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Guard against infinite loops or overly large ranges
  const maxDays = 90; 
  let daysCount = 0;

  for (let d = new Date(start); d <= end && daysCount < maxDays; d.setDate(d.getDate() + 1)) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    try {
      const snap = await getDoc(doc(db, 'bea_data', APP_ID, 'caixa', dateStr));
      if (snap.exists()) {
        const data = snap.data();
        if (data.movimentos && Array.isArray(data.movimentos)) {
          for (const m of data.movimentos) {
            // We only care about entries (entradas), as exits are usually payments made by the clinic
            if (m.tipo === 'entrada') {
              movements.push({
                ...m,
                date: dateStr // Add the context date
              });
            }
          }
        }
      }
    } catch (e) {
      console.error(`Error fetching cash for ${dateStr}:`, e);
    }
    
    daysCount++;
  }

  return movements;
};
