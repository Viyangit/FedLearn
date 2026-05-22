//! Elastic Weight Consolidation — empirical Fisher diagonal and quadratic penalty.

use candle_core::{DType, Result, Tensor};

use crate::lora::LoraWeights;

#[derive(serde::Serialize, serde::Deserialize, Default, Clone)]
pub struct EwcState {
    pub fisher_a: Vec<Vec<f32>>,
    pub fisher_b: Vec<Vec<f32>>,
    pub optimal_a: Vec<Vec<f32>>,
    pub optimal_b: Vec<Vec<f32>>,
    pub lambda: f32,
    pub num_layers: usize,
}

impl EwcState {
    pub fn new(lambda: f32) -> Self {
        Self {
            fisher_a: Vec::new(),
            fisher_b: Vec::new(),
            optimal_a: Vec::new(),
            optimal_b: Vec::new(),
            lambda,
            num_layers: 0,
        }
    }

    pub fn consolidate(
        &mut self,
        weights: &LoraWeights,
        session_sq_grads_a: Vec<Vec<f32>>,
        session_sq_grads_b: Vec<Vec<f32>>,
    ) -> Result<()> {
        self.num_layers = weights.num_layers;
        self.fisher_a = session_sq_grads_a;
        self.fisher_b = session_sq_grads_b;
        self.optimal_a.clear();
        self.optimal_b.clear();
        for layer in 0..weights.num_layers {
            let (a, b) = weights.weights_flat(layer)?;
            self.optimal_a.push(a);
            self.optimal_b.push(b);
        }
        Ok(())
    }

    /// Scalar penalty `(λ/2) Σ F (θ - θ*)²` — differentiable when built as `penalty_tensor`.
    pub fn penalty(&self, weights: &LoraWeights) -> Result<f32> {
        if self.num_layers == 0 || self.lambda == 0.0 {
            return Ok(0.0);
        }
        let t = self.penalty_tensor(weights)?;
        t.to_scalar::<f32>()
    }

    /// Full graph for backprop through θ.
    pub fn penalty_tensor(&self, weights: &LoraWeights) -> Result<Tensor> {
        let device = weights.device.clone();
        if self.num_layers == 0 || self.lambda == 0.0 {
            return Tensor::zeros((), DType::F32, &device);
        }

        let mut acc = Tensor::zeros((), DType::F32, &device)?;
        for layer in 0..self.num_layers {
            let va = &weights.lora_a[layer];
            let vb = &weights.lora_b[layer];
            let cur_a = va.as_tensor();
            let cur_b = vb.as_tensor();

            let fa = &self.fisher_a[layer];
            let fb = &self.fisher_b[layer];
            let oa = &self.optimal_a[layer];
            let ob = &self.optimal_b[layer];

            let oa_t = Tensor::from_vec(oa.clone(), cur_a.shape(), &device)?;
            let ob_t = Tensor::from_vec(ob.clone(), cur_b.shape(), &device)?;
            let fa_t = Tensor::from_vec(fa.clone(), cur_a.shape(), &device)?;
            let fb_t = Tensor::from_vec(fb.clone(), cur_b.shape(), &device)?;

            let da = cur_a.sub(&oa_t)?;
            let db = cur_b.sub(&ob_t)?;
            let pa = fa_t.mul(&da.sqr()?)?;
            let pb = fb_t.mul(&db.sqr()?)?;
            let sa = pa.sum_all()?;
            let sb = pb.sum_all()?;
            acc = acc.add(&sa)?;
            acc = acc.add(&sb)?;
        }
        let half_lambda = (self.lambda as f64) * 0.5;
        acc.affine(half_lambda, 0.0)
    }

    pub fn to_json_bytes(&self) -> serde_json::Result<Vec<u8>> {
        serde_json::to_vec(self)
    }

    pub fn from_json_bytes(bytes: &[u8]) -> serde_json::Result<Self> {
        serde_json::from_slice(bytes)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::lora::LoraWeights;

    #[test]
    fn penalty_returns_zero_when_num_layers_zero() -> Result<()> {
        let w = LoraWeights::new(32, 2, 2, 1.0)?;
        let ewc = EwcState::new(400.0);
        assert_eq!(ewc.penalty(&w)?, 0.0);
        Ok(())
    }

    #[test]
    fn penalty_positive_after_consolidate_and_change() -> Result<()> {
        let w = LoraWeights::new(32, 2, 2, 1.0)?;
        let mut ewc = EwcState::new(10.0);
        let fa: Vec<Vec<f32>> = (0..2)
            .map(|_| vec![1.0f32; 32 * 2])
            .collect();
        let fb: Vec<Vec<f32>> = (0..2)
            .map(|_| vec![1.0f32; 2 * 32])
            .collect();
        ewc.consolidate(&w, fa, fb)?;

        // Perturb A weights in varmap
        let device = w.device.clone();
        let noise = Tensor::randn(0f32, 0.5f32, (32, 2), &device)?;
        {
            let mut lock = w.varmap.data().lock().unwrap();
            let v = lock.get_mut("la_0").unwrap();
            let new_t = v.as_tensor().add(&noise)?;
            v.set(&new_t)?;
        }

        let p = ewc.penalty(&w)?;
        assert!(p > 0.0, "penalty should be > 0 after weight change");
        Ok(())
    }
}
