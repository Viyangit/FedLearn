use fedlearn_server::byzantine::filter_by_sketch_consensus;
use fedlearn_server::trust::TrustRegistry;

#[test]
fn poisoning_like_outlier_gets_filtered() {
    let ids = vec!["good-a".to_string(), "good-b".to_string(), "poison".to_string()];
    let sketches = vec![
        vec![0.9, 1.0, 1.1],
        vec![1.0, 1.0, 1.0],
        vec![-5.0, -5.0, -5.0],
    ];
    let allowed = filter_by_sketch_consensus(&ids, &sketches, -0.2);
    assert!(allowed.contains("good-a"));
    assert!(allowed.contains("good-b"));
    assert!(!allowed.contains("poison"));
}

#[test]
fn repeated_bad_signals_drop_trust() {
    let mut trust = TrustRegistry::new();
    for _ in 0..15 {
        trust.update("poison", -1.0);
    }
    assert!(trust.is_banned("poison"));
}

#[test]
fn poisoning_threshold_matrix_has_expected_sensitivity() {
    let ids = vec![
        "good-a".to_string(),
        "good-b".to_string(),
        "good-c".to_string(),
        "poison".to_string(),
    ];
    let sketches = vec![
        vec![1.0, 1.0, 1.0],
        vec![0.95, 1.05, 1.0],
        vec![1.02, 0.98, 1.01],
        vec![-4.0, -4.0, -4.0],
    ];
    let strict = filter_by_sketch_consensus(&ids, &sketches, 0.2);
    let medium = filter_by_sketch_consensus(&ids, &sketches, 0.0);
    let permissive = filter_by_sketch_consensus(&ids, &sketches, -0.2);

    assert!(!strict.contains("poison"));
    assert!(!medium.contains("poison"));
    assert!(!permissive.contains("poison"));
    assert!(strict.len() <= medium.len());
    assert!(medium.len() <= permissive.len());
}

