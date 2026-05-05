use fedlearn_core::adapter::cold_start::{svd_from_weight, svd_style_cold_start, WarmUpConfig, WarmUpState};
use fedlearn_core::adapter::dar::DarScheduler;
use fedlearn_core::adapter::lora::{contract_rank_truncate, expand_rank_svd, matmul, merge_weights, validate_rank, Matrix};

#[test]
fn rank_bounds_enforced() {
    assert!(validate_rank(4).is_ok());
    assert!(validate_rank(16).is_ok());
    assert!(validate_rank(3).is_err());
    assert!(validate_rank(17).is_err());
    assert!(validate_rank(5).is_err());
}

#[test]
fn cold_start_keeps_ab_zero_initially() {
    let layer = svd_style_cold_start(0, 6, 6, 4).expect("cold start layer");
    let ab = matmul(&layer.a, &layer.b).expect("A*B");
    assert!(ab.data.iter().all(|v| *v == 0.0));
}

#[test]
fn merge_weights_adds_adapter_product() {
    let w = Matrix::from_vec(
        2,
        2,
        vec![
            1.0, 2.0, //
            3.0, 4.0,
        ],
    )
    .expect("W");
    let a = Matrix::from_vec(2, 1, vec![1.0, 2.0]).expect("A");
    let b = Matrix::from_vec(1, 2, vec![10.0, 20.0]).expect("B");

    let merged = merge_weights(&w, &a, &b).expect("merged");
    let expected = Matrix::from_vec(
        2,
        2,
        vec![
            11.0, 22.0, //
            23.0, 44.0,
        ],
    )
    .expect("expected");
    assert_eq!(merged, expected);
}

#[test]
fn dar_scheduler_respects_thresholds() {
    let mut scheduler = DarScheduler::new(0.15);
    let next = scheduler.next_rank(4, 0.20).expect("expand");
    assert_eq!(next, 6);

    let same1 = scheduler.next_rank(6, 0.02).expect("low-1");
    let same2 = scheduler.next_rank(6, 0.02).expect("low-2");
    let down = scheduler.next_rank(6, 0.02).expect("low-3");
    assert_eq!(same1, 6);
    assert_eq!(same2, 6);
    assert_eq!(down, 4);
}

#[test]
fn dar_scheduler_caps_rank_bounds() {
    let mut scheduler = DarScheduler::new(0.15);
    let up = scheduler.next_rank(16, 1.0).expect("cap-up");
    assert_eq!(up, 16);

    let _ = scheduler.next_rank(4, 0.01).expect("low-1");
    let _ = scheduler.next_rank(4, 0.01).expect("low-2");
    let down = scheduler.next_rank(4, 0.01).expect("cap-down");
    assert_eq!(down, 4);
}

#[test]
fn warmup_state_transitions_to_normal_lr() {
    let config = WarmUpConfig {
        warm_up_interactions: 2,
        lr_multiplier: 3.0,
    };
    let mut state = WarmUpState::new(config);
    assert!(state.is_warming_up());
    assert_eq!(state.current_lr_multiplier(), 3.0);

    state.advance_session();
    assert!(state.is_warming_up());
    assert_eq!(state.current_lr_multiplier(), 3.0);

    state.advance_session();
    assert!(!state.is_warming_up());
    assert_eq!(state.current_lr_multiplier(), 1.0);
}

#[test]
fn rank_expand_and_contract_preserve_shapes() {
    let a = Matrix::from_vec(4, 4, vec![1.0; 16]).expect("a");
    let b = Matrix::from_vec(4, 4, vec![0.0; 16]).expect("b");
    let (a_exp, b_exp) = expand_rank_svd(&a, &b, 6).expect("expand");
    assert_eq!(a_exp.cols, 6);
    assert_eq!(b_exp.rows, 6);

    let (a_con, b_con) = contract_rank_truncate(&a_exp, &b_exp, 4).expect("contract");
    assert_eq!(a_con.cols, 4);
    assert_eq!(b_con.rows, 4);
}

#[test]
fn svd_from_weight_keeps_zero_disruption_at_init() {
    let weight = Matrix::from_vec(4, 4, vec![
        1.0, 0.0, 0.0, 0.0,
        0.0, 2.0, 0.0, 0.0,
        0.0, 0.0, 3.0, 0.0,
        0.0, 0.0, 0.0, 4.0,
    ]).expect("weight");
    let layer = svd_from_weight(0, &weight, 4).expect("svd init");
    let ab = matmul(&layer.a, &layer.b).expect("ab");
    assert!(ab.data.iter().all(|v| *v == 0.0));
}

