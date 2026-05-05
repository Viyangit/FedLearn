pub mod adapter;
pub mod continual;
pub mod crypto;
pub mod determinism;
pub mod federation;
pub mod privacy;
pub mod session;

use thiserror::Error;

#[derive(Debug, Error)]
pub enum FedLearnError {
    #[error("Invalid seed material for deterministic RNG")]
    InvalidSeedMaterial,
    #[error("Adapter rank {rank} out of valid range [4, 16]")]
    InvalidRank { rank: usize },
    #[error("Dimension mismatch in adapter operation")]
    DimensionMismatch,
    #[error("Proxy corpus missing at '{path}'")]
    ProxyCorpusMissing { path: String },
    #[error("Proxy corpus has {found} samples, minimum required is 100")]
    ProxyCorpusTooSmall { found: usize },
    #[error("Serialization error: {message}")]
    Serialization { message: String },
    #[error("Invalid clip norm: {clip_norm}")]
    InvalidClipNorm { clip_norm: f32 },
    #[error("Invalid noise multiplier: {noise_multiplier}")]
    InvalidNoiseMultiplier { noise_multiplier: f32 },
    #[error("Budget state tampered")]
    BudgetTampered,
    #[error("Session already closed")]
    SessionAlreadyClosed,
    #[error("Empty interaction stream")]
    EmptyInteractionStream,
    #[error("Crypto operation failed: {message}")]
    Crypto { message: String },
}

