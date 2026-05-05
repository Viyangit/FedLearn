use serde::{Deserialize, Serialize};
use nalgebra::DMatrix;

use crate::adapter::lora::{validate_rank, LoraLayer, Matrix};
use crate::FedLearnError;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct WarmUpConfig {
    pub warm_up_interactions: usize,
    pub lr_multiplier: f32,
}

impl Default for WarmUpConfig {
    fn default() -> Self {
        Self {
            warm_up_interactions: 5,
            lr_multiplier: 3.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct WarmUpState {
    pub session_count: usize,
    pub warm_up_interactions: usize,
    pub lr_multiplier: f32,
}

impl WarmUpState {
    pub fn new(config: WarmUpConfig) -> Self {
        Self {
            session_count: 0,
            warm_up_interactions: config.warm_up_interactions,
            lr_multiplier: config.lr_multiplier,
        }
    }

    pub fn is_warming_up(&self) -> bool {
        self.session_count < self.warm_up_interactions
    }

    pub fn current_lr_multiplier(&self) -> f32 {
        if self.is_warming_up() {
            self.lr_multiplier
        } else {
            1.0
        }
    }

    pub fn advance_session(&mut self) {
        self.session_count = self.session_count.saturating_add(1);
    }
}

pub fn svd_style_cold_start(layer_idx: usize, d: usize, k: usize, rank: usize) -> Result<LoraLayer, FedLearnError> {
    validate_rank(rank)?;
    if d == 0 || k == 0 {
        return Err(FedLearnError::DimensionMismatch);
    }

    // Sector 08 hardening (still lightweight):
    // A keeps an orthogonal-basis style init and B starts at zero so A*B=0.
    // This preserves no-disruption-at-init invariant while leaving room for
    // future full SVD integration.
    let mut a = Matrix::zeros(d, rank);
    for i in 0..d.min(rank) {
        a.set(i, i, 1.0 / ((i + 1) as f32).sqrt());
    }
    let b = Matrix::zeros(rank, k);

    Ok(LoraLayer { layer_idx, a, b })
}

pub fn svd_from_weight(layer_idx: usize, weight: &Matrix, rank: usize) -> Result<LoraLayer, FedLearnError> {
    validate_rank(rank)?;
    if weight.rows == 0 || weight.cols == 0 {
        return Err(FedLearnError::DimensionMismatch);
    }
    let w = DMatrix::from_row_slice(weight.rows, weight.cols, &weight.data);
    let svd = w.svd(true, false);
    let u = svd.u.ok_or(FedLearnError::DimensionMismatch)?;
    let mut a = Matrix::zeros(weight.rows, rank);
    let r = rank.min(u.ncols());
    for row in 0..weight.rows {
        for col in 0..r {
            let sigma = svd.singular_values[col].sqrt();
            a.set(row, col, u[(row, col)] * sigma);
        }
    }
    let b = Matrix::zeros(rank, weight.cols);
    Ok(LoraLayer { layer_idx, a, b })
}

