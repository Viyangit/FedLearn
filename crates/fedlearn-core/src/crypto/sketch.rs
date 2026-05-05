use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CountSketch {
    pub output_dim: usize,
}

impl CountSketch {
    pub fn new(input_dim: usize) -> Self {
        let output_dim = (input_dim / 100).max(1);
        Self { output_dim }
    }

    pub fn compress(&self, gradient: &[f32]) -> Vec<f32> {
        let mut out = vec![0.0_f32; self.output_dim];
        for (i, g) in gradient.iter().enumerate() {
            let bucket = i % self.output_dim;
            let sign = if (i / self.output_dim).is_multiple_of(2) { 1.0 } else { -1.0 };
            out[bucket] += sign * g;
        }
        out
    }
}

pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    let dot = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum::<f32>();
    let na = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let nb = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    if na == 0.0 || nb == 0.0 {
        return 0.0;
    }
    dot / (na * nb)
}

