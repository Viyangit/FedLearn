use fedlearn_server::byzantine::filter_by_sketch_consensus;
use fedlearn_server::trust::TrustRegistry;

#[test]
fn trust_registry_updates_and_ban_threshold() {
    let mut reg = TrustRegistry::new();
    let id = "poisoner";

    // Push score down over multiple harmful contributions.
    for _ in 0..20 {
        reg.update(id, -1.0);
    }
    assert!(reg.is_banned(id));
}

#[test]
fn trust_weights_sum_to_one() {
    let mut reg = TrustRegistry::new();
    reg.update("a", 1.0);
    reg.update("b", 0.0);
    reg.update("c", -1.0);

    let ids = vec!["a".to_string(), "b".to_string(), "c".to_string()];
    let weights = reg.normalized_weights(&ids, 0.1);
    let sum = weights.values().sum::<f32>();
    assert!((sum - 1.0).abs() < 1e-4);
}

#[test]
fn byzantine_filter_excludes_outlier_sketch() {
    let ids = vec!["a".to_string(), "b".to_string(), "c".to_string()];
    let sketches = vec![
        vec![1.0, 1.0, 1.0],
        vec![1.0, 1.0, 1.0],
        vec![-1.0, -1.0, -1.0],
    ];
    let allowed = filter_by_sketch_consensus(&ids, &sketches, 0.0);
    assert!(allowed.contains("a"));
    assert!(allowed.contains("b"));
    assert!(!allowed.contains("c"));
}

