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

import { getActiveTenantId } from './dataService';

// Helpers para caminhos isolados por clínica
const REC_DOC = (col: string, id: string, tenantId: string = getActiveTenantId()) => doc(db!, 'clinicas', tenantId, col, id);
const REC_COL = (col: string, tenantId: string = getActiveTenantId()) => collection(db!, 'clinicas', tenantId, col);

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
export const getReconciliationConfig = async (tenantId: string = getActiveTenantId()): Promise<ReconciliationConfig> => {
  if (!db) return DEFAULT_RATES;
  
  try {
    // Check local config first
    const localSnap = await getDoc(REC_DOC('reconciliation', 'config', tenantId));
    if (localSnap.exists()) {
      return localSnap.data() as ReconciliationConfig;
    }

    // Fallback to pricing config
    const pricingSnap = await getDoc(REC_DOC('pricing', 'config', tenantId));
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

export const saveReconciliationConfig = async (config: ReconciliationConfig, tenantId: string = getActiveTenantId()) => {
  if (!db) return;
  await setDoc(REC_DOC('reconciliation', 'config', tenantId), config);
};

export const fetchReconciliations = async (tenantId: string = getActiveTenantId()): Promise<Reconciliation[]> => {
  if (!db) return [];
  const q = query(
    REC_COL('reconciliations', tenantId),
    orderBy('importedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as Reconciliation);
};

export const fetchReconciliationDetails = async (id: string, tenantId: string = getActiveTenantId()): Promise<{
  reconciliation: Reconciliation;
  items: ReconciliationItem[];
} | null> => {
  if (!db) return null;
  const recSnap = await getDoc(REC_DOC('reconciliations', id, tenantId));
  if (!recSnap.exists()) return null;

  const itemsQ = query(
    REC_COL('reconciliation_items', tenantId),
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
  items: ReconciliationItem[],
  tenantId: string = getActiveTenantId()
) => {
  if (!db) return;
  const batch = writeBatch(db);

  // Save main record
  batch.set(
    REC_DOC('reconciliations', reconciliation.id, tenantId),
    reconciliation
  );

  // Save all items
  for (const item of items) {
    batch.set(
      REC_DOC('reconciliation_items', item.id, tenantId),
      item
    );
  }

  await batch.commit();
};

export const updateReconciliationItem = async (
  itemId: string,
  updates: Partial<ReconciliationItem>,
  tenantId: string = getActiveTenantId()
) => {
  if (!db) return;
  await setDoc(
    REC_DOC('reconciliation_items', itemId, tenantId),
    updates,
    { merge: true }
  );
};

export const fetchCashMovements = async (startDate: string, endDate: string, tenantId: string = getActiveTenantId()) => {
  if (!db) return [];
  
  const movements: any[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const maxDays = 90; 
  let daysCount = 0;

  for (let d = new Date(start); d <= end && daysCount < maxDays; d.setDate(d.getDate() + 1)) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    try {
      const snap = await getDoc(REC_DOC('caixa', dateStr, tenantId));
      if (snap.exists()) {
        const data = snap.data();
        if (data.movimentos && Array.isArray(data.movimentos)) {
          for (const m of data.movimentos) {
            if (m.tipo === 'entrada') {
              movements.push({
                ...m,
                date: dateStr
              });
            }
          }
        }
      }
    } catch (e) {
      console.error(`Error fetching cash for date ${dateStr}:`, e);
    }
    daysCount++;
  }

  return movements;
};
