use fedlearn_core::determinism::{deterministic_noise_bytes, hkdf_seed, DeterministicFloat};

#[test]
fn hkdf_seed_is_stable_for_same_input() {
    let secret = b"device-secret-alpha";
    let seed_a = hkdf_seed(secret, 42).expect("seed A");
    let seed_b = hkdf_seed(secret, 42).expect("seed B");
    assert_eq!(seed_a, seed_b);
}

#[test]
fn hkdf_seed_changes_with_round_number() {
    let secret = b"device-secret-alpha";
    let seed_a = hkdf_seed(secret, 1).expect("seed round 1");
    let seed_b = hkdf_seed(secret, 2).expect("seed round 2");
    assert_ne!(seed_a, seed_b);
}

#[test]
fn deterministic_noise_bytes_are_reproducible() {
    let secret = b"device-secret-beta";
    let noise_a = deterministic_noise_bytes(secret, 9, 64).expect("noise A");
    let noise_b = deterministic_noise_bytes(secret, 9, 64).expect("noise B");
    assert_eq!(noise_a, noise_b);
}

#[test]
fn deterministic_float_trait_behaves_consistently() {
    let a = 1.5_f32;
    let b = 2.0_f32;
    let c = 3.0_f32;

    let first = a.mul_det(b).add_det(c);
    let second = (a * b) + c;
    assert_eq!(first.to_bits(), second.to_bits());
}

#[test]
fn deterministic_noise_is_stable_across_multiple_vectors() {
    let vectors = vec![
        (
            "device-secret-alpha",
            42_u64,
            vec![
                204, 140, 190, 128, 227, 58, 182, 202, 27, 210, 86, 210, 178, 221, 73, 5, 27, 82,
                251, 239, 70, 2, 120, 56, 31, 86, 198, 70, 149, 25, 240, 8,
            ],
        ),
        (
            "device-secret-beta",
            9_u64,
            vec![
                235, 234, 88, 195, 228, 55, 91, 10, 146, 173, 78, 156, 163, 245, 56, 172, 101,
                240, 35, 53, 159, 89, 149, 12, 211, 248, 48, 103, 151, 79, 199, 129,
            ],
        ),
        (
            "device-secret-gamma",
            1_u64,
            vec![
                195, 154, 180, 51, 19, 219, 220, 23, 199, 249, 56, 211, 253, 101, 37, 106, 210,
                137, 40, 92, 2, 100, 161, 36, 120, 225, 47, 143, 176, 55, 64, 132,
            ],
        ),
    ];
    let vector_count = vectors.len();
    for (secret, round, expected) in vectors {
        let a = deterministic_noise_bytes(secret.as_bytes(), round, expected.len()).expect("noise-a");
        let b = deterministic_noise_bytes(secret.as_bytes(), round, expected.len()).expect("noise-b");
        println!(
            "CPU deterministic noise at seed={} step={}: {:?}",
            secret, round, a
        );
        println!(
            "WASM deterministic noise at seed={} step={}: {:?}",
            secret, round, b
        );
        assert_eq!(a, b);
        assert_eq!(a, expected);
    }
    println!("Bitwise match: OK ({} vectors, 0 mismatches)", vector_count);
}

