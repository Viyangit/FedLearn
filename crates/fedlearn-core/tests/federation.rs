use fedlearn_core::federation::fedprox::fedprox_penalty;
use fedlearn_core::federation::scaffold::scaffold_corrected_gradient;

#[test]
fn scaffold_correction_applies_control_variates() {
    let g = vec![1.0, 2.0];
    let c_i = vec![0.5, 0.5];
    let c_global = vec![0.1, 0.1];
    let out = scaffold_corrected_gradient(&g, &c_i, &c_global);
    assert!((out[0] - 0.6).abs() < 1e-6);
    assert!((out[1] - 1.6).abs() < 1e-6);
}

#[test]
fn fedprox_penalty_increases_with_drift() {
    let near = fedprox_penalty(&[1.0, 1.0], &[1.0, 1.0], 0.1);
    let far = fedprox_penalty(&[2.0, 3.0], &[1.0, 1.0], 0.1);
    assert!(far > near);
}

