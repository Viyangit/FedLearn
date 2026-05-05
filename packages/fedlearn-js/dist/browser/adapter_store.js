const DB_NAME = "fedlearn";
const ADAPTER_STORE = "adapters";
const FORBIDDEN_FIELDS = ["sessionState", "sessionGradients", "rawInteractions", "sscState"];
export async function openAdapterDb() {
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
export function validateNoForbiddenFields(record) {
    for (const field of FORBIDDEN_FIELDS) {
        if (field in record) {
            throw new Error(`Forbidden persistence field detected: ${field}`);
        }
    }
}
export async function saveAdapterRecord(record) {
    validateNoForbiddenFields(record);
    const db = await openAdapterDb();
    await new Promise((resolve, reject) => {
        const tx = db.transaction(ADAPTER_STORE, "readwrite");
        tx.objectStore(ADAPTER_STORE).put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
export async function loadAdapterRecord(userId) {
    const db = await openAdapterDb();
    return await new Promise((resolve, reject) => {
        const tx = db.transaction(ADAPTER_STORE, "readonly");
        const req = tx.objectStore(ADAPTER_STORE).get(userId);
        req.onsuccess = () => resolve((req.result ?? null));
        req.onerror = () => reject(req.error);
    });
}
