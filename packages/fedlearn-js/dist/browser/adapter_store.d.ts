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
export declare function openAdapterDb(): Promise<IDBDatabase>;
export declare function validateNoForbiddenFields(record: Record<string, unknown>): void;
export declare function saveAdapterRecord(record: AdapterRecord): Promise<void>;
export declare function loadAdapterRecord(userId: string): Promise<AdapterRecord | null>;
