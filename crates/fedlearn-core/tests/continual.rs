use std::fs;

use fedlearn_core::adapter::lora::Matrix;
use fedlearn_core::continual::ewc::{compute_fim_proxy_only, epsilon_cost_for_proxy_fim, ewc_loss, FisherDiagonal};
use fedlearn_core::continual::gem::project_gradient;

fn make_proxy_file(sample_count: usize) -> std::path::PathBuf {
    let mut lines = String::new();
    for i in 0..sample_count {
        lines.push_str(&format!(
            "{{\"text\":\"sample-{i}\",\"source\":\"public_domain\"}}\n"
        ));
    }

    let path = std::env::temp_dir().join(format!("fedlearn_proxy_{sample_count}.jsonl"));
    fs::write(&path, lines).expect("write proxy corpus");
    path
}

#[test]
fn fim_requires_minimum_proxy_samples() {
    let path = make_proxy_file(10);
    let err = compute_fim_proxy_only(&path, 4).expect_err("must fail");
    let msg = format!("{err}");
    assert!(msg.contains("minimum required is 100"));
}

#[test]
fn fim_loads_proxy_corpus_and_returns_expected_size() {
    let path = make_proxy_file(100);
    let fim = compute_fim_proxy_only(&path, 8).expect("fim");
    assert_eq!(fim.values.len(), 8);
}

#[test]
fn ewc_loss_penalizes_parameter_drift() {
    let fisher = FisherDiagonal {
        values: vec![1.0, 1.0, 1.0, 1.0],
    };
    let current = Matrix::from_vec(2, 2, vec![1.0, 2.0, 3.0, 4.0]).expect("current");
    let previous = Matrix::from_vec(2, 2, vec![1.0, 1.0, 3.0, 3.0]).expect("previous");
    let loss = ewc_loss(0.5, &fisher, &current, &previous, 1.0).expect("loss");
    assert!(loss > 0.5);
}

#[test]
fn gem_projection_removes_conflicting_component() {
    let candidate = vec![1.0, 0.0];
    let memory_ref = vec![-1.0, 0.0];
    let projected = project_gradient(&candidate, &memory_ref);
    let dot = projected
        .iter()
        .zip(memory_ref.iter())
        .map(|(a, b)| a * b)
        .sum::<f32>();
    assert!(dot >= -1e-6);
}

#[test]
fn proxy_fim_has_zero_epsilon_cost() {
    assert_eq!(epsilon_cost_for_proxy_fim(), 0.0);
}

