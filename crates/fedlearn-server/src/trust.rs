use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrustRegistry {
    scores: HashMap<String, f32>,
}

impl TrustRegistry {
    pub fn new() -> Self {
        Self {
            scores: HashMap::new(),
        }
    }

    pub fn score_of(&self, device_id: &str) -> f32 {
        *self.scores.get(device_id).unwrap_or(&0.5)
    }

    pub fn update(&mut self, device_id: &str, delta_loss_sign: f32) -> f32 {
        let current = self.score_of(device_id);
        let sign = if delta_loss_sign > 0.0 {
            1.0
        } else if delta_loss_sign < 0.0 {
            -1.0
        } else {
            0.0
        };
        let updated = (0.9 * current + 0.1 * sign).clamp(0.0, 1.0);
        self.scores.insert(device_id.to_string(), updated);
        updated
    }

    pub fn is_banned(&self, device_id: &str) -> bool {
        self.score_of(device_id) < 0.3
    }

    pub fn normalized_weights(&self, ids: &[String], temperature: f32) -> HashMap<String, f32> {
        if ids.is_empty() {
            return HashMap::new();
        }
        let t = temperature.max(1e-6);
        let exps: Vec<(String, f32)> = ids
            .iter()
            .map(|id| (id.clone(), (self.score_of(id) / t).exp()))
            .collect();
        let sum = exps.iter().map(|(_, v)| *v).sum::<f32>().max(1e-6);
        exps.into_iter().map(|(id, v)| (id, v / sum)).collect()
    }
}

