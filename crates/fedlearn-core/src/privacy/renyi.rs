use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RenyiAccountant {
    pub orders: Vec<u32>,
    pub moments: Vec<f64>,
}

impl RenyiAccountant {
    pub fn new_default() -> Self {
        let orders = vec![2, 4, 8, 16, 32, 64];
        Self {
            moments: vec![0.0; orders.len()],
            orders,
        }
    }

    pub fn step(&mut self, sigma: f64, sampling_rate: f64) {
        let q = sampling_rate.clamp(1e-8, 1.0);
        for (i, alpha) in self.orders.iter().enumerate() {
            // Gaussian-mechanism style approximation with subsampling factor.
            let increment = (q * q) * (*alpha as f64) / (2.0 * sigma.max(1e-8).powi(2));
            self.moments[i] += increment;
        }
    }

    pub fn compute_epsilon(&self, delta: f64) -> f64 {
        self.orders
            .iter()
            .enumerate()
            .map(|(i, alpha)| (self.moments[i] - delta.ln()) / (*alpha as f64 - 1.0))
            .fold(f64::INFINITY, f64::min)
    }
}

