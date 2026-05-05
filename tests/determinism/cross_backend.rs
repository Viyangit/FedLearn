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

