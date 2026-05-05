use fedlearn_core::adapter::cold_start::svd_style_cold_start;
use fedlearn_core::adapter::lora::LoraAdapter;
use fedlearn_core::session::session::{Interaction, Session};
use static_assertions::assert_not_impl_any;

assert_not_impl_any!(Session<'static>: Send, Sync);

fn make_adapter() -> LoraAdapter {
    let layer = svd_style_cold_start(0, 4, 4, 4).expect("layer");
    LoraAdapter {
        rank: 4,
        layers: vec![layer],
        user_id: "u1".to_string(),
        session_count: 0,
        budget_remaining: 8.0,
    }
}

#[test]
fn session_learn_updates_counter() {
    let mut adapter = make_adapter();
    let mut session = adapter.begin_session("s1");
    session
        .learn(&[Interaction {
            input: "hi".to_string(),
            output: "hello".to_string(),
            loss: Some(0.5),
        }])
        .expect("learn");
    assert_eq!(session.interaction_count(), 1);
}

#[test]
fn session_close_returns_delta_and_increments_count() {
    let mut adapter = make_adapter();
    let mut session = adapter.begin_session("s1");
    session
        .learn(&[Interaction {
            input: "a".to_string(),
            output: "b".to_string(),
            loss: Some(1.0),
        }])
        .expect("learn");
    let delta = session.close().expect("close");
    assert_eq!(delta.layers.len(), 1);
    assert_eq!(adapter.session_count, 1);
}

