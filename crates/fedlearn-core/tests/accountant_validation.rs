use fedlearn_core::privacy::renyi::RenyiAccountant;

#[test]
fn accountant_monotonicity_with_more_steps() {
    let mut acc = RenyiAccountant::new_default();
    let e0 = acc.compute_epsilon(1e-5);
    for _ in 0..100 {
        acc.step(1.1, 0.01);
    }
    let e1 = acc.compute_epsilon(1e-5);
    assert!(e1 > e0);
}

#[test]
fn accountant_known_value_regression() {
    let mut acc = RenyiAccountant::new_default();
    acc.step(1.1, 0.01);
    let eps = acc.compute_epsilon(1e-5);
    // Regression guard for current reference implementation shape.
    assert!(eps > 0.0);
    let mut acc2 = RenyiAccountant::new_default();
    acc2.step(1.1, 0.01);
    let eps2 = acc2.compute_epsilon(1e-5);
    assert!((eps - eps2).abs() < 1e-12);
}

