use fedlearn_core::determinism::deterministic_noise_bytes;

#[test]
fn wasm_crate_links_to_core_determinism() {
    let a = deterministic_noise_bytes(b"wasm-secret", 1, 8).expect("noise A");
    let b = deterministic_noise_bytes(b"wasm-secret", 1, 8).expect("noise B");
    assert_eq!(a, b);
}

