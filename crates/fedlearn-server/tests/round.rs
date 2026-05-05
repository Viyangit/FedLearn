use fedlearn_server::round::{DeviceSubmission, RoundManager, RoundState};
use fedlearn_server::trust::TrustRegistry;

#[test]
fn round_state_progression_happy_path() {
    let mut manager = RoundManager::new();
    let _round_id = manager.start_round();
    assert_eq!(manager.state, RoundState::Registering);

    manager.register_device("dev-a");
    manager.register_device("dev-b");
    manager.begin_collection();
    assert_eq!(manager.state, RoundState::Collecting);

    manager.submit_update(DeviceSubmission {
        device_id: "dev-a".to_string(),
        masked_gradient: vec![1.0, 2.0],
        sketch: vec![0.1, 0.2],
    });
    assert_eq!(manager.submission_count(), 1);

    manager.begin_filtering();
    manager.begin_aggregation();
    manager.begin_distribution();
    manager.complete_round();
    assert_eq!(manager.state, RoundState::Complete);
}

#[test]
fn submission_ignored_when_not_registered() {
    let mut manager = RoundManager::new();
    manager.start_round();
    manager.begin_collection();

    manager.submit_update(DeviceSubmission {
        device_id: "unknown".to_string(),
        masked_gradient: vec![1.0],
        sketch: vec![0.1],
    });
    assert_eq!(manager.submission_count(), 0);
}

#[test]
fn round_does_not_collect_without_registered_participants() {
    let mut manager = RoundManager::new();
    manager.start_round();
    manager.begin_collection();
    assert_eq!(manager.state, RoundState::Registering);
    assert_eq!(manager.participant_count(), 0);
}

#[test]
fn round_does_not_filter_without_submissions() {
    let mut manager = RoundManager::new();
    manager.start_round();
    manager.register_device("dev-a");
    manager.begin_collection();
    manager.begin_filtering();
    assert_eq!(manager.state, RoundState::Collecting);
}

#[test]
fn filtered_weighted_aggregate_returns_vector() {
    let mut manager = RoundManager::new();
    manager.start_round();
    manager.register_device("dev-a");
    manager.register_device("dev-b");
    manager.begin_collection();
    manager.submit_update(DeviceSubmission {
        device_id: "dev-a".to_string(),
        masked_gradient: vec![1.0, 1.0],
        sketch: vec![1.0, 1.0],
    });
    manager.submit_update(DeviceSubmission {
        device_id: "dev-b".to_string(),
        masked_gradient: vec![2.0, 2.0],
        sketch: vec![1.0, 1.0],
    });
    let trust = TrustRegistry::new();
    let out = manager.aggregate_filtered_weighted(&trust, 0.0, 0.1);
    assert_eq!(out.len(), 2);
}

#[test]
fn soft_label_aggregation_computes_mean() {
    let mut manager = RoundManager::new();
    manager.start_round();
    manager.register_device("dev-a");
    manager.register_device("dev-b");
    manager.begin_collection();
    manager.submit_soft_labels("dev-a".to_string(), vec![0.2, 0.8]);
    manager.submit_soft_labels("dev-b".to_string(), vec![0.4, 0.6]);
    let avg = manager.aggregate_soft_labels().expect("avg labels");
    assert!((avg[0] - 0.3).abs() < 1e-6);
    assert!((avg[1] - 0.7).abs() < 1e-6);
}

