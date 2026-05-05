use serde::{Deserialize, Serialize};

use crate::{adapter::lora::validate_rank, FedLearnError};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DarScheduler {
    pub tau: f32,
    low_kl_streak: u8,
}

impl DarScheduler {
    pub fn new(tau: f32) -> Self {
        Self {
            tau,
            low_kl_streak: 0,
        }
    }

    pub fn next_rank(&mut self, current_rank: usize, kl_divergence: f32) -> Result<usize, FedLearnError> {
        validate_rank(current_rank)?;

        if kl_divergence > self.tau {
            self.low_kl_streak = 0;
            return Ok((current_rank + 2).min(16));
        }

        if kl_divergence < self.tau / 3.0 {
            self.low_kl_streak = self.low_kl_streak.saturating_add(1);
            if self.low_kl_streak >= 3 {
                self.low_kl_streak = 0;
                return Ok((current_rank.saturating_sub(2)).max(4));
            }
        } else {
            self.low_kl_streak = 0;
        }

        Ok(current_rank)
    }

    pub fn kl_probe(before: &[f32], after: &[f32]) -> Result<f32, FedLearnError> {
        if before.len() != after.len() || before.is_empty() {
            return Err(FedLearnError::DimensionMismatch);
        }
        let eps = 1e-8_f32;
        let mut kl = 0.0_f32;
        for (p, q) in before.iter().zip(after.iter()) {
            let pp = (*p).max(eps);
            let qq = (*q).max(eps);
            kl += pp * (pp / qq).ln();
        }
        Ok(kl)
    }
}

