use std::sync::{Arc, Mutex};

use axum::{extract::State, routing::post, Json, Router};
use fedlearn_server::round::{DeviceSubmission, RoundManager};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone)]
struct AppState {
    round: Arc<Mutex<RoundManager>>,
}

#[derive(Debug, Serialize)]
struct StartRoundResponse {
    round_id: Uuid,
}

#[derive(Debug, Deserialize)]
struct RegisterRequest {
    device_id: String,
}

#[derive(Debug, Serialize)]
struct OkResponse {
    ok: bool,
}

#[tokio::main]
async fn main() {
    let state = AppState {
        round: Arc::new(Mutex::new(RoundManager::new())),
    };

    let app = Router::new()
        .route("/round/start", post(start_round))
        .route("/round/register", post(register))
        .route("/round/submit", post(submit))
        .route("/distillation/submit", post(submit_distillation))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:4000")
        .await
        .expect("bind");
    axum::serve(listener, app).await.expect("serve");
}

async fn start_round(State(state): State<AppState>) -> Json<StartRoundResponse> {
    let mut round = state.round.lock().expect("round lock");
    let round_id = round.start_round();
    Json(StartRoundResponse { round_id })
}

async fn register(
    State(state): State<AppState>,
    Json(req): Json<RegisterRequest>,
) -> Json<OkResponse> {
    let mut round = state.round.lock().expect("round lock");
    round.register_device(&req.device_id);
    Json(OkResponse { ok: true })
}

async fn submit(
    State(state): State<AppState>,
    Json(submission): Json<DeviceSubmission>,
) -> Json<OkResponse> {
    let mut round = state.round.lock().expect("round lock");
    round.submit_update(submission);
    Json(OkResponse { ok: true })
}

#[derive(Debug, Deserialize)]
struct DistillationSubmitRequest {
    device_id: String,
    soft_labels: Vec<f32>,
}

async fn submit_distillation(
    State(state): State<AppState>,
    Json(req): Json<DistillationSubmitRequest>,
) -> Json<OkResponse> {
    let mut round = state.round.lock().expect("round lock");
    round.submit_soft_labels(req.device_id, req.soft_labels);
    Json(OkResponse { ok: true })
}

