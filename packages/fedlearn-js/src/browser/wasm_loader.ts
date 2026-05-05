export interface BrowserInitOptions {
  wasmUrl?: string;
}

export type TrainingBackend = "wasm";
export type InferenceBackend = "webgpu" | "wasm";

let initialized = false;
let wasmBytesLength = 0;
let lastError: string | null = null;
let lastWasmUrl: string | null = null;

function hasWasmMagicHeader(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x00 &&
    bytes[1] === 0x61 &&
    bytes[2] === 0x73 &&
    bytes[3] === 0x6d
  );
}

export async function initWasm(opts: BrowserInitOptions = {}): Promise<void> {
  const wasmUrl = opts.wasmUrl ?? "/fedlearn_wasm_bg.wasm";
  lastWasmUrl = wasmUrl;
  lastError = null;
  initialized = false;
  if (typeof fetch !== "function") {
    lastError = "Fetch API unavailable in current runtime";
    throw new Error(lastError);
  }
  const resp = await fetch(wasmUrl);
  if (!resp.ok) {
    lastError = `Failed to fetch wasm: ${resp.status}`;
    throw new Error(lastError);
  }
  const bytes = await resp.arrayBuffer();
  wasmBytesLength = bytes.byteLength;
  if (!hasWasmMagicHeader(new Uint8Array(bytes))) {
    lastError = `Invalid wasm binary at ${wasmUrl}: missing magic header`;
    throw new Error(lastError);
  }
  // Instantiate for validation; exports are not yet wired in scaffold.
  try {
    await WebAssembly.instantiate(bytes, {});
    initialized = true;
  } catch (err) {
    lastError = `WASM instantiate failed at ${wasmUrl}: ${String(err)}`;
    throw new Error(lastError);
  }
}

export function selectBackends(webgpuAvailable: boolean): {
  inference: InferenceBackend;
  training: TrainingBackend;
} {
  return {
    inference: webgpuAvailable ? "webgpu" : "wasm",
    training: "wasm"
  };
}

export function wasmHealthCheck(): {
  ok: boolean;
  initialized: boolean;
  wasmBytesLength: number;
  lastError: string | null;
  lastWasmUrl: string | null;
} {
  return {
    ok: initialized && lastError === null,
    initialized,
    wasmBytesLength,
    lastError,
    lastWasmUrl
  };
}

