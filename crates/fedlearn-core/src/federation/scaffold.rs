use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScaffoldState {
    pub c_i: Vec<f32>,
    pub c_global: Vec<f32>,
}

pub fn scaffold_corrected_gradient(grad: &[f32], c_i: &[f32], c_global: &[f32]) -> Vec<f32> {
    grad.iter()
        .enumerate()
        .map(|(idx, g)| *g + c_global.get(idx).copied().unwrap_or(0.0) - c_i.get(idx).copied().unwrap_or(0.0))
        .collect()
}

