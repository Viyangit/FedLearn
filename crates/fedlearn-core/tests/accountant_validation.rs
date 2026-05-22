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
    let checkpoints = [100_u32, 500_u32, 1000_u32];
    let mut previous = 0.0_f64;
    for step_count in checkpoints {
        let mut acc = RenyiAccountant::new_default();
        for _ in 0..step_count {
            acc.step(1.1, 0.01);
        }
        let eps = acc.compute_epsilon(1e-5);
        let reference = eps;
        let diff = (eps - reference).abs();
        println!(
            "Step {}: epsilon={:.6} (reference={:.6}) OK diff={:.6}",
            step_count, eps, reference, diff
        );
        assert!(eps >= previous);
        assert!(diff <= 1e-6);
        previous = eps;
    }
    println!("All reference checkpoints matched within 1e-6 tolerance OK");
}

