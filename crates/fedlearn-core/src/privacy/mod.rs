pub mod budget;
pub mod dp_sgd;
pub mod he;
pub mod renyi;

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PrivacyConfig {
    pub epsilon: f64,
    pub delta: f64,
    pub clip_norm: f32,
    pub noise_multiplier: f32,
    pub mode: FederationMode,
    pub tier: PrivacyTier,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum FederationMode {
    Gradient,
    Distillation,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum PrivacyTier {
    Dp,
    He,
}

