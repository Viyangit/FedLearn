use fedlearn_core::determinism::deterministic_noise_bytes;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WasmHealth {
    pub ok: bool,
    pub runtime: String,
}

#[wasm_bindgen]
pub fn health_check() -> JsValue {
    let out = WasmHealth {
        ok: true,
        runtime: "wasm".to_string(),
    };
    serde_wasm_bindgen::to_value(&out).expect("serialize health")
}

#[wasm_bindgen]
pub fn deterministic_noise_hex(secret: String, round: u64, len: usize) -> String {
    let bytes = deterministic_noise_bytes(secret.as_bytes(), round, len).unwrap_or_default();
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

