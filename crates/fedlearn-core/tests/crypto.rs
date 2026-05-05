use fedlearn_core::crypto::secagg::{aggregate_masked, mask_update, SecAggParticipant};
use fedlearn_core::crypto::sketch::{cosine_similarity, CountSketch};

#[test]
fn secagg_masks_cancel_in_aggregate_sum() {
    let p1 = SecAggParticipant {
        device_id: "a".to_string(),
        private_seed: 11,
    };
    let p2 = SecAggParticipant {
        device_id: "b".to_string(),
        private_seed: 22,
    };
    let p3 = SecAggParticipant {
        device_id: "c".to_string(),
        private_seed: 33,
    };
    let participants = vec![p1.clone(), p2.clone(), p3.clone()];

    let g1 = vec![1.0, 2.0, 3.0];
    let g2 = vec![4.0, 5.0, 6.0];
    let g3 = vec![7.0, 8.0, 9.0];

    let m1 = mask_update(&p1, &participants, &g1);
    let m2 = mask_update(&p2, &participants, &g2);
    let m3 = mask_update(&p3, &participants, &g3);

    let agg = aggregate_masked(&[m1, m2, m3]);
    let expected = vec![12.0, 15.0, 18.0];
    for (a, e) in agg.iter().zip(expected.iter()) {
        assert!((a - e).abs() < 1e-5);
    }
}

#[test]
fn secagg_dropout_still_aggregates_survivor_with_drift_bound() {
    let p1 = SecAggParticipant {
        device_id: "a".to_string(),
        private_seed: 11,
    };
    let p2 = SecAggParticipant {
        device_id: "b".to_string(),
        private_seed: 22,
    };
    let p3 = SecAggParticipant {
        device_id: "c".to_string(),
        private_seed: 33,
    };
    let participants = vec![p1.clone(), p2.clone(), p3.clone()];
    let g1 = vec![1.0, 2.0, 3.0];
    let g2 = vec![4.0, 5.0, 6.0];
    let m1 = mask_update(&p1, &participants, &g1);
    let m2 = mask_update(&p2, &participants, &g2);
    let agg = aggregate_masked(&[m1, m2]);
    assert_eq!(agg.len(), 3);
    // Missing participant masks should not explode aggregate magnitude.
    for value in agg {
        assert!(value.is_finite());
        assert!(value.abs() < 20.0);
    }
}

#[test]
fn sketch_compression_and_similarity_work() {
    let grad_a = vec![1.0_f32; 200];
    let mut grad_b = vec![1.0_f32; 200];
    grad_b[0] = -1.0;

    let sketch = CountSketch::new(200);
    let sa = sketch.compress(&grad_a);
    let sb = sketch.compress(&grad_b);
    assert_eq!(sa.len(), 2);
    assert_eq!(sb.len(), 2);

    let sim = cosine_similarity(&sa, &sb);
    assert!(sim < 1.0);
}

