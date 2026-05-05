use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EpisodicMemory {
    pub gradients: Vec<Vec<f32>>,
    pub capacity: usize,
}

impl EpisodicMemory {
    pub fn new(capacity: usize) -> Self {
        Self {
            gradients: Vec::new(),
            capacity,
        }
    }

    pub fn push(&mut self, gradient: Vec<f32>) {
        if self.gradients.len() == self.capacity {
            self.gradients.remove(0);
        }
        self.gradients.push(gradient);
    }
}

pub fn project_gradient(candidate: &[f32], memory_reference: &[f32]) -> Vec<f32> {
    // Sector 03 scaffold: if candidate conflicts by negative dot product,
    // project away from the conflicting direction.
    let dot = candidate
        .iter()
        .zip(memory_reference.iter())
        .map(|(a, b)| a * b)
        .sum::<f32>();

    if dot >= 0.0 {
        return candidate.to_vec();
    }

    let denom = memory_reference.iter().map(|v| v * v).sum::<f32>().max(1e-8);
    let scale = dot / denom;
    candidate
        .iter()
        .zip(memory_reference.iter())
        .map(|(c, m)| c - scale * m)
        .collect()
}

