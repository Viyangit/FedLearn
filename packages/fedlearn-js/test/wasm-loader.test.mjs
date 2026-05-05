import test from "node:test";
import assert from "node:assert/strict";
import { initWasm, wasmHealthCheck } from "../dist/index.js";

const originalFetch = globalThis.fetch;
const originalInstantiate = WebAssembly.instantiate;

test("initWasm reports fetch status errors through health check", async () => {
  globalThis.fetch = async () => ({ ok: false, status: 404 });
  await assert.rejects(() => initWasm({ wasmUrl: "/missing.wasm" }), /Failed to fetch wasm: 404/);
  const health = wasmHealthCheck();
  assert.equal(health.initialized, false);
  assert.match(health.lastError ?? "", /Failed to fetch wasm/);
});

test("initWasm rejects invalid wasm bytes with explicit message", async () => {
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    arrayBuffer: async () => new TextEncoder().encode("<!doctype html>").buffer
  });
  await assert.rejects(() => initWasm({ wasmUrl: "/fedlearn_wasm_bg.wasm" }), /missing magic header/);
  const health = wasmHealthCheck();
  assert.equal(health.initialized, false);
  assert.match(health.lastError ?? "", /Invalid wasm binary/);
});

test("initWasm succeeds for valid wasm-like bytes", async () => {
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    arrayBuffer: async () => new Uint8Array([0x00, 0x61, 0x73, 0x6d, 1, 0, 0, 0]).buffer
  });
  Object.defineProperty(WebAssembly, "instantiate", {
    configurable: true,
    writable: true,
    value: async () => ({ instance: {} })
  });
  await initWasm({ wasmUrl: "/fedlearn_wasm_bg.wasm" });
  const health = wasmHealthCheck();
  assert.equal(health.initialized, true);
  assert.equal(health.lastError, null);
});

test.after(() => {
  globalThis.fetch = originalFetch;
  Object.defineProperty(WebAssembly, "instantiate", {
    configurable: true,
    writable: true,
    value: originalInstantiate
  });
});

