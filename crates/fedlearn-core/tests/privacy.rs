use fedlearn_core::privacy::budget::BudgetState;
use fedlearn_core::privacy::dp_sgd::dp_sgd_step;
use fedlearn_core::privacy::he::{dequantize_from_he, quantize_for_he};
use fedlearn_core::privacy::renyi::RenyiAccountant;

#[test]
fn dp_sgd_rejects_invalid_clip_norm() {
    let gradients = vec![vec![1.0, 2.0]];
    let result = dp_sgd_step(&gradients, 0.0, 1.0);
    assert!(result.is_err());
}

#[test]
fn dp_sgd_returns_clipped_average() {
    let gradients = vec![vec![3.0, 4.0], vec![0.0, 0.0]];
    let result = dp_sgd_step(&gradients, 1.0, 1.0).expect("dp result");
    assert_eq!(result.clipped_average.len(), 2);
}

#[test]
fn renyi_accountant_increases_after_steps() {
    let mut accountant = RenyiAccountant::new_default();
    let before = accountant.compute_epsilon(1e-5);
    accountant.step(1.1, 0.01);
    accountant.step(1.1, 0.01);
    let after = accountant.compute_epsilon(1e-5);
    assert!(after > before);
}

#[test]
fn budget_sign_and_verify_detects_tampering() {
    let secret = b"device-secret";
    let mut state = BudgetState::new(8.0);
    state.consumed_epsilon = 1.2;
    state.round_count = 4;
    state.sign(secret);
    assert!(state.verify(secret).is_ok());

    state.consumed_epsilon = 9.0;
    assert!(state.verify(secret).is_err());
}

#[test]
fn he_quantize_roundtrip_is_reasonable() {
    let g = vec![0.12, -0.33, 1.0];
    let q = quantize_for_he(&g, 1024.0);
    let out = dequantize_from_he(&q);
    assert_eq!(out.len(), g.len());
    for (a, b) in out.iter().zip(g.iter()) {
        assert!((a - b).abs() < 0.01);
    }
}

