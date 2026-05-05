use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SscEncoder {
    pub state: Vec<f32>,
    w1: Vec<f32>, // 1x64
    w2: Vec<f32>, // 64x128
}

impl SscEncoder {
    pub fn new() -> Self {
        Self {
            state: Vec::new(),
            w1: vec![0.01; 64],
            w2: vec![0.005; 64 * 128],
        }
    }

    pub fn learn_loss(&mut self, loss: f32) {
        self.state.push(loss);
    }

    pub fn embedding(&self) -> [f32; 128] {
        let mut out = [0.0_f32; 128];
        if self.state.is_empty() {
            return out;
        }

        // Layer 1: Linear(1,64)+ReLU over each loss, then mean-pool.
        let mut h = [0.0_f32; 64];
        for loss in &self.state {
            for (i, wi) in self.w1.iter().enumerate() {
                h[i] += (loss * wi).max(0.0);
            }
        }
        let n = self.state.len() as f32;
        for v in &mut h {
            *v /= n;
        }

        // Layer 2: Linear(64,128)
        for (j, outj) in out.iter_mut().enumerate() {
            let mut sum = 0.0_f32;
            for (i, hv) in h.iter().enumerate() {
                sum += hv * self.w2[i * 128 + j];
            }
            *outj = sum;
        }
        out
    }

    pub fn project_delta(&self, embedding: &[f32; 128], da_len: usize, db_len: usize) -> (Vec<f32>, Vec<f32>) {
        let scale = 1e-3;
        let mut da = vec![0.0_f32; da_len];
        let mut db = vec![0.0_f32; db_len];
        for (idx, v) in da.iter_mut().enumerate() {
            *v = embedding[idx % 128] * scale;
        }
        for (idx, v) in db.iter_mut().enumerate() {
            *v = embedding[(idx + 17) % 128] * scale;
        }
        (da, db)
    }

    pub fn zero_state(&mut self) {
        for v in &mut self.state {
            *v = 0.0;
        }
        self.state.clear();
    }
}

