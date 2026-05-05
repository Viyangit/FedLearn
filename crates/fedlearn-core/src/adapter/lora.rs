use serde::{Deserialize, Serialize};
use nalgebra::DMatrix;

use crate::FedLearnError;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Matrix {
    pub rows: usize,
    pub cols: usize,
    pub data: Vec<f32>,
}

impl Matrix {
    pub fn zeros(rows: usize, cols: usize) -> Self {
        Self {
            rows,
            cols,
            data: vec![0.0; rows * cols],
        }
    }

    pub fn from_vec(rows: usize, cols: usize, data: Vec<f32>) -> Result<Self, FedLearnError> {
        if rows * cols != data.len() {
            return Err(FedLearnError::DimensionMismatch);
        }
        Ok(Self { rows, cols, data })
    }

    pub fn get(&self, r: usize, c: usize) -> f32 {
        self.data[r * self.cols + c]
    }

    pub fn set(&mut self, r: usize, c: usize, value: f32) {
        self.data[r * self.cols + c] = value;
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct LoraLayer {
    pub layer_idx: usize,
    pub a: Matrix,
    pub b: Matrix,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct LoraAdapter {
    pub rank: usize,
    pub layers: Vec<LoraLayer>,
    pub user_id: String,
    pub session_count: u64,
    pub budget_remaining: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct LayerDelta {
    pub layer_idx: usize,
    pub da: Matrix,
    pub db: Matrix,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct LoraDelta {
    pub layers: Vec<LayerDelta>,
    pub session_id: String,
    pub privacy_cost: f64,
}

pub fn validate_rank(rank: usize) -> Result<(), FedLearnError> {
    if !(4..=16).contains(&rank) || rank % 2 != 0 {
        return Err(FedLearnError::InvalidRank { rank });
    }
    Ok(())
}

pub fn matmul(a: &Matrix, b: &Matrix) -> Result<Matrix, FedLearnError> {
    if a.cols != b.rows {
        return Err(FedLearnError::DimensionMismatch);
    }

    let mut out = Matrix::zeros(a.rows, b.cols);
    for r in 0..a.rows {
        for c in 0..b.cols {
            let mut sum = 0.0_f32;
            for k in 0..a.cols {
                sum += a.get(r, k) * b.get(k, c);
            }
            out.set(r, c, sum);
        }
    }
    Ok(out)
}

pub fn merge_weights(base_w: &Matrix, a: &Matrix, b: &Matrix) -> Result<Matrix, FedLearnError> {
    let ab = matmul(a, b)?;
    if ab.rows != base_w.rows || ab.cols != base_w.cols {
        return Err(FedLearnError::DimensionMismatch);
    }

    let mut out = Matrix::zeros(base_w.rows, base_w.cols);
    for r in 0..base_w.rows {
        for c in 0..base_w.cols {
            out.set(r, c, base_w.get(r, c) + ab.get(r, c));
        }
    }
    Ok(out)
}

pub fn expand_rank_svd(a: &Matrix, b: &Matrix, new_rank: usize) -> Result<(Matrix, Matrix), FedLearnError> {
    validate_rank(new_rank)?;
    if new_rank <= a.cols || a.cols != b.rows {
        return Err(FedLearnError::DimensionMismatch);
    }
    let old_rank = a.cols;
    let mut a_new = Matrix::zeros(a.rows, new_rank);
    let mut b_new = Matrix::zeros(new_rank, b.cols);

    for r in 0..a.rows {
        for c in 0..old_rank {
            a_new.set(r, c, a.get(r, c));
        }
    }
    for r in 0..old_rank {
        for c in 0..b.cols {
            b_new.set(r, c, b.get(r, c));
        }
    }

    let m = DMatrix::from_row_slice(a.rows, a.cols, &a.data);
    let svd = m.svd(true, false);
    if let Some(u) = svd.u {
        let add = new_rank - old_rank;
        for add_idx in 0..add {
            let src_col = add_idx.min(u.ncols().saturating_sub(1));
            for r in 0..a.rows {
                a_new.set(r, old_rank + add_idx, u[(r, src_col)] * 0.1);
            }
        }
    }

    Ok((a_new, b_new))
}

pub fn contract_rank_truncate(a: &Matrix, b: &Matrix, new_rank: usize) -> Result<(Matrix, Matrix), FedLearnError> {
    validate_rank(new_rank)?;
    if new_rank > a.cols || a.cols != b.rows {
        return Err(FedLearnError::DimensionMismatch);
    }
    let mut a_new = Matrix::zeros(a.rows, new_rank);
    let mut b_new = Matrix::zeros(new_rank, b.cols);
    for r in 0..a.rows {
        for c in 0..new_rank {
            a_new.set(r, c, a.get(r, c));
        }
    }
    for r in 0..new_rank {
        for c in 0..b.cols {
            b_new.set(r, c, b.get(r, c));
        }
    }
    Ok((a_new, b_new))
}

