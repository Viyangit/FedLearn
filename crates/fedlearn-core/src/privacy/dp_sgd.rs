use serde::{Deserialize, Serialize};

use crate::FedLearnError;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DpSgdStepResult {
    pub clipped_average: Vec<f32>,
    pub epsilon_cost_hint: f64,
}

pub fn dp_sgd_step(
    gradients: &[Vec<f32>],
    clip_norm: f32,
    noise_multiplier: f32,
) -> Result<DpSgdStepResult, FedLearnError> {
    if clip_norm <= 0.0 {
        return Err(FedLearnError::InvalidClipNorm { clip_norm });
    }
    if noise_multiplier < 0.0 {
        return Err(FedLearnError::InvalidNoiseMultiplier { noise_multiplier });
    }
    if gradients.is_empty() {
        return Ok(DpSgdStepResult {
            clipped_average: vec![],
            epsilon_cost_hint: 0.0,
        });
    }

    let dim = gradients[0].len();
    let mut accum = vec![0.0_f32; dim];

    for g in gradients {
        let norm = g.iter().map(|v| v * v).sum::<f32>().sqrt();
        let scale = (clip_norm / (norm + 1e-8)).min(1.0);
        for (i, val) in g.iter().enumerate() {
            accum[i] += val * scale;
        }
    }

    let n = gradients.len() as f32;
    for a in &mut accum {
        *a /= n;
    }

    Ok(DpSgdStepResult {
        clipped_average: accum,
        epsilon_cost_hint: (noise_multiplier as f64 + 1.0) / 100.0,
    })
}

