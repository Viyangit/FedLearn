export interface AdapterLayerRecord {
  layerIdx: number;
  a: number[];
  b: number[];
}

export interface BudgetRecord {
  totalEpsilon: number;
  consumedEpsilon: number;
  roundCount: number;
  hmac: string;
}

export interface AdapterRecord {
  userId: string;
  rank: number;
  layers: AdapterLayerRecord[];
  budgetState: BudgetRecord;
  sessionCount: number;
  lastUpdated: number;
  version: number;
}

const DB_NAME = "fedlearn";
const ADAPTER_STORE = "adapters";
const FORBIDDEN_FIELDS = ["sessionState", "sessionGradients", "rawInteractions", "sscState"];

export async function openAdapterDb(): Promise<IDBDatabase> {
  return await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ADAPTER_STORE)) {
        db.createObjectStore(ADAPTER_STORE, { keyPath: "userId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function validateNoForbiddenFields(record: Record<string, unknown>) {
  for (const field of FORBIDDEN_FIELDS) {
    if (field in record) {
      throw new Error(`Forbidden persistence field detected: ${field}`);
    }
  }
}

export async function saveAdapterRecord(record: AdapterRecord): Promise<void> {
  validateNoForbiddenFields(record as unknown as Record<string, unknown>);
  const db = await openAdapterDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(ADAPTER_STORE, "readwrite");
    tx.objectStore(ADAPTER_STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAdapterRecord(userId: string): Promise<AdapterRecord | null> {
  const db = await openAdapterDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(ADAPTER_STORE, "readonly");
    const req = tx.objectStore(ADAPTER_STORE).get(userId);
    req.onsuccess = () => resolve((req.result ?? null) as AdapterRecord | null);
    req.onerror = () => reject(req.error);
  });
}

