//! Training session: multi-layer MSE + EWC, SGD, Fisher accumulation.

use candle_core::{Result, Tensor};
use candle_nn::optim::{Optimizer, SGD};

use crate::ewc::EwcState;
use crate::lora::LoraWeights;

pub struct TrainSession {
    pub weights: LoraWeights,
    pub ewc: EwcState,
    optimizer: SGD,
    sq_grad_accum_a: Vec<Vec<f32>>,
    sq_grad_accum_b: Vec<Vec<f32>>,
    turn_count: usize,
    lr: f32,
}

impl TrainSession {
    pub fn new(weights: LoraWeights, ewc: EwcState, lr: f32) -> Result<Self> {
        let vars = weights.vars_in_order();
        let optimizer = SGD::new(vars, lr as f64)?;
        let mut sq_grad_accum_a = Vec::with_capacity(weights.num_layers);
        let mut sq_grad_accum_b = Vec::with_capacity(weights.num_layers);
        for _ in 0..weights.num_layers {
            sq_grad_accum_a.push(vec![
                0f32;
                weights.d_model * weights.rank
            ]);
            sq_grad_accum_b.push(vec![0f32; weights.rank * weights.d_model]);
        }
        Ok(Self {
            weights,
            ewc,
            optimizer,
            sq_grad_accum_a,
            sq_grad_accum_b,
            turn_count: 0,
            lr,
        })
    }

    pub fn turn_count(&self) -> usize {
        self.turn_count
    }

    fn accumulate_squared_grads(&mut self, grads: &candle_core::backprop::GradStore) -> Result<()> {
        for layer in 0..self.weights.num_layers {
            let va = &self.weights.lora_a[layer];
            let vb = &self.weights.lora_b[layer];
            let ta = va.as_tensor();
            let tb = vb.as_tensor();
            if let Some(ga) = grads.get(ta) {
                let gv = ga.flatten_all()?.to_vec1::<f32>()?;
                for (j, val) in gv.iter().enumerate() {
                    self.sq_grad_accum_a[layer][j] += val * val;
                }
            }
            if let Some(gb) = grads.get(tb) {
                let gv = gb.flatten_all()?.to_vec1::<f32>()?;
                for (j, val) in gv.iter().enumerate() {
                    self.sq_grad_accum_b[layer][j] += val * val;
                }
            }
        }
        Ok(())
    }

    pub fn train_step(&mut self, input: &[f32], target: &[f32]) -> Result<f32> {
        if input.len() != self.weights.d_model || target.len() != self.weights.d_model {
            return Err(candle_core::Error::Msg(
                "input/target length must equal d_model".into(),
            ));
        }
        let dev = self.weights.device.clone();
        let input_t = Tensor::from_vec(input.to_vec(), (1, self.weights.d_model), &dev)?;
        let target_t = Tensor::from_vec(target.to_vec(), (1, self.weights.d_model), &dev)?;

        let mut layer_losses: Vec<Tensor> = Vec::with_capacity(self.weights.num_layers);
        for i in 0..self.weights.num_layers {
            let pred = self.weights.forward(&input_t, i)?;
            let diff = pred.sub(&target_t)?;
            let mse = diff.sqr()?.mean_all()?;
            layer_losses.push(mse);
        }

        let mut sum_mse = layer_losses[0].clone();
        for i in 1..layer_losses.len() {
            sum_mse = sum_mse.add(&layer_losses[i])?;
        }
        let n = layer_losses.len() as f64;
        let mean_mse = sum_mse.affine(1.0 / n, 0.0)?;
        let ewc_term = self.ewc.penalty_tensor(&self.weights)?;
        let total_loss = mean_mse.add(&ewc_term)?;

        let grads = total_loss.backward()?;
        self.optimizer.step(&grads)?;
        self.accumulate_squared_grads(&grads)?;

        self.turn_count += 1;
        total_loss.to_scalar::<f32>()
    }

    pub fn consolidate(&mut self) -> Result<()> {
        if self.turn_count == 0 {
            return Ok(());
        }
        let tc = self.turn_count as f32;
        let mut mean_a: Vec<Vec<f32>> = Vec::with_capacity(self.weights.num_layers);
        let mut mean_b: Vec<Vec<f32>> = Vec::with_capacity(self.weights.num_layers);
        for layer in 0..self.weights.num_layers {
            mean_a.push(
                self.sq_grad_accum_a[layer]
                    .iter()
                    .map(|x| x / tc)
                    .collect(),
            );
            mean_b.push(
                self.sq_grad_accum_b[layer]
                    .iter()
                    .map(|x| x / tc)
                    .collect(),
            );
        }
        self.ewc
            .consolidate(&self.weights, mean_a, mean_b)?;
        for layer in 0..self.weights.num_layers {
            self.sq_grad_accum_a[layer].fill(0.0);
            self.sq_grad_accum_b[layer].fill(0.0);
        }
        self.turn_count = 0;

        let vars = self.weights.vars_in_order();
        self.optimizer = SGD::new(vars, self.lr as f64)?;
        Ok(())
    }

    pub fn forward_eval(&self, input: &[f32], layer: usize) -> Result<Tensor> {
        if input.len() != self.weights.d_model {
            return Err(candle_core::Error::Msg("input len".into()));
        }
        let dev = self.weights.device.clone();
        let input_t = Tensor::from_vec(input.to_vec(), (1, self.weights.d_model), &dev)?;
        self.weights.forward(&input_t, layer)
    }

    pub fn into_parts(self) -> (LoraWeights, EwcState) {
        (self.weights, self.ewc)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn train_step_finite_positive_loss() -> Result<()> {
        let w = LoraWeights::new(512, 8, 4, 4.0)?;
        let ewc = EwcState::new(400.0);
        let mut s = TrainSession::new(w, ewc, 0.01)?;
        let input = vec![0.1f32; 512];
        let target = vec![0.5f32; 512];
        let loss = s.train_step(&input, &target)?;
        assert!(loss.is_finite() && loss > 0.0);
        Ok(())
    }

    #[test]
    fn loss_decreases_over_ten_steps() -> Result<()> {
        let w = LoraWeights::new(512, 8, 4, 4.0)?;
        let ewc = EwcState::new(0.0);
        let mut s = TrainSession::new(w, ewc, 0.05)?;
        let input = vec![0.1f32; 512];
        let target = vec![0.5f32; 512];
        let l0 = s.train_step(&input, &target)?;
        let mut last = l0;
        for _ in 1..10 {
            last = s.train_step(&input, &target)?;
        }
        assert!(last < l0, "last {last} should be < first {l0}");
        Ok(())
    }

    #[test]
    fn turn_count_increments() -> Result<()> {
        let w = LoraWeights::new(64, 2, 2, 1.0)?;
        let ewc = EwcState::new(0.0);
        let mut s = TrainSession::new(w, ewc, 0.01)?;
        assert_eq!(s.turn_count(), 0);
        s.train_step(&vec![0.1; 64], &vec![0.5; 64])?;
        assert_eq!(s.turn_count(), 1);
        Ok(())
    }

    #[test]
    fn consolidate_resets_turn_count() -> Result<()> {
        let w = LoraWeights::new(64, 2, 2, 1.0)?;
        let ewc = EwcState::new(0.0);
        let mut s = TrainSession::new(w, ewc, 0.01)?;
        s.train_step(&vec![0.1; 64], &vec![0.5; 64])?;
        s.consolidate()?;
        assert_eq!(s.turn_count(), 0);
        Ok(())
    }
}
