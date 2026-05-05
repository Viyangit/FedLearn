use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::adapter::lora::Matrix;
use crate::FedLearnError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyCorpusSample {
    pub text: String,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FisherDiagonal {
    pub values: Vec<f32>,
}

pub fn load_proxy_corpus(path: &Path) -> Result<Vec<ProxyCorpusSample>, FedLearnError> {
    let raw = fs::read_to_string(path).map_err(|_| FedLearnError::ProxyCorpusMissing {
        path: path.display().to_string(),
    })?;

    let mut samples = Vec::new();
    for line in raw.lines() {
        if line.trim().is_empty() {
            continue;
        }
        let sample: ProxyCorpusSample =
            serde_json::from_str(line).map_err(|e| FedLearnError::Serialization {
                message: e.to_string(),
            })?;
        samples.push(sample);
    }

    if samples.len() < 100 {
        return Err(FedLearnError::ProxyCorpusTooSmall {
            found: samples.len(),
        });
    }

    Ok(samples)
}

pub fn compute_fim_proxy_only(path: &Path, param_dim: usize) -> Result<FisherDiagonal, FedLearnError> {
    let samples = load_proxy_corpus(path)?;
    // Sector 03 scaffold: deterministic placeholder distribution using sample count.
    let base = 1.0_f32 / samples.len() as f32;
    Ok(FisherDiagonal {
        values: vec![base; param_dim],
    })
}

pub fn epsilon_cost_for_proxy_fim() -> f64 {
    0.0
}

pub fn ewc_loss(task_loss: f32, fisher: &FisherDiagonal, current: &Matrix, previous: &Matrix, lambda: f32) -> Result<f32, FedLearnError> {
    if current.rows != previous.rows || current.cols != previous.cols {
        return Err(FedLearnError::DimensionMismatch);
    }
    if fisher.values.len() != current.data.len() {
        return Err(FedLearnError::DimensionMismatch);
    }

    let mut penalty = 0.0_f32;
    for (i, theta) in current.data.iter().enumerate() {
        let delta = *theta - previous.data[i];
        penalty += fisher.values[i] * delta * delta;
    }
    Ok(task_loss + (lambda / 2.0) * penalty)
}

