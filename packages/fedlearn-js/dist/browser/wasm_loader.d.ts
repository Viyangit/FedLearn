export interface BrowserInitOptions {
    wasmUrl?: string;
}
export type TrainingBackend = "wasm";
export type InferenceBackend = "webgpu" | "wasm";
export declare function initWasm(opts?: BrowserInitOptions): Promise<void>;
export declare function selectBackends(webgpuAvailable: boolean): {
    inference: InferenceBackend;
    training: TrainingBackend;
};
export declare function wasmHealthCheck(): {
    ok: boolean;
    initialized: boolean;
    wasmBytesLength: number;
    lastError: string | null;
    lastWasmUrl: string | null;
};
