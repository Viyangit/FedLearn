//! LoRA weight storage using `VarMap` / per-layer low-rank matrices.

use std::io::{Cursor, Read};

use byteorder::{LittleEndian, ReadBytesExt, WriteBytesExt};
use candle_core::{DType, Device, Result, Tensor, Var};
use candle_nn::{Init, VarMap};

/// Magic bytes "FLA\0" — FedLearn Adapter.
pub const FLA_MAGIC: [u8; 4] = [0x46, 0x4c, 0x41, 0x00];
pub const FLA_VERSION: u8 = 1;

pub struct LoraWeights {
    pub varmap: VarMap,
    pub(crate) lora_a: Vec<Var>,
    pub(crate) lora_b: Vec<Var>,
    pub d_model: usize,
    pub rank: usize,
    pub alpha: f32,
    pub num_layers: usize,
    pub device: Device,
}

impl LoraWeights {
    pub fn new(
        d_model: usize,
        num_layers: usize,
        rank: usize,
        alpha: f32,
    ) -> Result<Self> {
        let device = Device::Cpu;
        let varmap = VarMap::new();
        let mut lora_a = Vec::with_capacity(num_layers);
        let mut lora_b = Vec::with_capacity(num_layers);

        for i in 0..num_layers {
            let _ = varmap.get(
                (d_model, rank),
                &format!("la_{i}"),
                Init::Randn {
                    mean: 0.,
                    stdev: 0.02,
                },
                DType::F32,
                &device,
            )?;
            let _ = varmap.get(
                (rank, d_model),
                &format!("lb_{i}"),
                Init::Const(0.),
                DType::F32,
                &device,
            )?;

            let lock = varmap.data().lock().map_err(|_| {
                candle_core::Error::Msg("varmap poisoned".into())
            })?;
            let av = lock
                .get(&format!("la_{i}"))
                .ok_or_else(|| candle_core::Error::Msg("missing la var".into()))?
                .clone();
            let bv = lock
                .get(&format!("lb_{i}"))
                .ok_or_else(|| candle_core::Error::Msg("missing lb var".into()))?
                .clone();
            drop(lock);
            lora_a.push(av);
            lora_b.push(bv);
        }

        Ok(Self {
            varmap,
            lora_a,
            lora_b,
            d_model,
            rank,
            alpha,
            num_layers,
            device,
        })
    }

    pub fn lora_a_var(&self, layer: usize) -> Option<&Var> {
        self.lora_a.get(layer)
    }

    pub fn lora_b_var(&self, layer: usize) -> Option<&Var> {
        self.lora_b.get(layer)
    }

    /// `x` shape `[1, d_model]`.
    pub fn forward(&self, x: &Tensor, layer: usize) -> Result<Tensor> {
        let idx = layer;
        let va = self
            .lora_a
            .get(idx)
            .ok_or_else(|| candle_core::Error::Msg("layer idx out of range".into()))?;
        let vb = self
            .lora_b
            .get(idx)
            .ok_or_else(|| candle_core::Error::Msg("layer idx out of range".into()))?;
        let scale = self.alpha / self.rank as f32;
        let ta = va.as_tensor();
        let tb = vb.as_tensor();
        let h = ta.matmul(tb)?;
        let out = x.matmul(&h)?;
        out.affine(scale as f64, 0.)
    }

    /// Flattened f32 values for Fisher / EWC snapshots (no grad).
    pub fn weights_flat(&self, layer: usize) -> Result<(Vec<f32>, Vec<f32>)> {
        let va = self
            .lora_a
            .get(layer)
            .ok_or_else(|| candle_core::Error::Msg("layer idx".into()))?;
        let vb = self
            .lora_b
            .get(layer)
            .ok_or_else(|| candle_core::Error::Msg("layer idx".into()))?;
        let a = va.as_tensor().flatten_all()?.to_vec1::<f32>()?;
        let b = vb.as_tensor().flatten_all()?.to_vec1::<f32>()?;
        Ok((a, b))
    }

    /// All trainable vars in layer order: la_0, lb_0, ...
    pub fn vars_in_order(&self) -> Vec<Var> {
        let mut out = Vec::with_capacity(self.num_layers * 2);
        for i in 0..self.num_layers {
            out.push(self.lora_a[i].clone());
            out.push(self.lora_b[i].clone());
        }
        out
    }

    /// Encode magic + header + raw layer weights (no EWC tail).
    pub fn to_bytes(&self) -> Result<Vec<u8>> {
        let mut w = Vec::new();
        w.extend_from_slice(&FLA_MAGIC);
        w.write_u8(FLA_VERSION).map_err(|e| {
            candle_core::Error::Msg(format!("io: {e}"))
        })?;
        w.write_u32::<LittleEndian>(self.num_layers as u32)
            .map_err(|e| candle_core::Error::Msg(format!("io: {e}")))?;
        w.write_u32::<LittleEndian>(self.d_model as u32)
            .map_err(|e| candle_core::Error::Msg(format!("io: {e}")))?;
        w.write_u32::<LittleEndian>(self.rank as u32)
            .map_err(|e| candle_core::Error::Msg(format!("io: {e}")))?;
        w.write_f32::<LittleEndian>(self.alpha)
            .map_err(|e| candle_core::Error::Msg(format!("io: {e}")))?;

        for layer in 0..self.num_layers {
            let (a, b) = self.weights_flat(layer)?;
            for f in a {
                w.write_f32::<LittleEndian>(f)
                    .map_err(|e| candle_core::Error::Msg(format!("io: {e}")))?;
            }
            for f in b {
                w.write_f32::<LittleEndian>(f)
                    .map_err(|e| candle_core::Error::Msg(format!("io: {e}")))?;
            }
        }
        Ok(w)
    }

    /// Decode weights from a buffer that starts at FLA magic and contains at least the weight blob.
    /// After reading weights, `cursor.position()` points at `ewc_present` if FIX-4 full blob.
    pub fn from_bytes(bytes: &[u8]) -> Result<(Self, usize)> {
        let mut c = Cursor::new(bytes);
        let mut magic = [0u8; 4];
        c.read_exact(&mut magic)
            .map_err(|e| candle_core::Error::Msg(format!("magic: {e}")))?;
        if magic != FLA_MAGIC {
            return Err(candle_core::Error::Msg("invalid FLA magic".into()));
        }
        let ver = c
            .read_u8()
            .map_err(|e| candle_core::Error::Msg(format!("ver: {e}")))?;
        if ver != FLA_VERSION {
            return Err(candle_core::Error::Msg("unsupported FLA version".into()));
        }
        let num_layers = c
            .read_u32::<LittleEndian>()
            .map_err(|e| candle_core::Error::Msg(format!("hdr: {e}")))? as usize;
        let d_model = c
            .read_u32::<LittleEndian>()
            .map_err(|e| candle_core::Error::Msg(format!("hdr: {e}")))? as usize;
        let rank = c
            .read_u32::<LittleEndian>()
            .map_err(|e| candle_core::Error::Msg(format!("hdr: {e}")))? as usize;
        let alpha = c
            .read_f32::<LittleEndian>()
            .map_err(|e| candle_core::Error::Msg(format!("hdr: {e}")))?;

        let device = Device::Cpu;
        let varmap = VarMap::new();
        let mut lora_a = Vec::with_capacity(num_layers);
        let mut lora_b = Vec::with_capacity(num_layers);

        for i in 0..num_layers {
            let na = d_model * rank;
            let mut ad = vec![0f32; na];
            for v in ad.iter_mut() {
                *v = c
                    .read_f32::<LittleEndian>()
                    .map_err(|e| candle_core::Error::Msg(format!("a[{i}]: {e}")))?;
            }
            let nb = rank * d_model;
            let mut bd = vec![0f32; nb];
            for v in bd.iter_mut() {
                *v = c
                    .read_f32::<LittleEndian>()
                    .map_err(|e| candle_core::Error::Msg(format!("b[{i}]: {e}")))?;
            }

            let t_a = Tensor::from_vec(ad, (d_model, rank), &device)?;
            let t_b = Tensor::from_vec(bd, (rank, d_model), &device)?;
            {
                let ia = format!("la_{i}");
                let ib = format!("lb_{i}");
                let mut lock = varmap.data().lock().map_err(|_| {
                    candle_core::Error::Msg("varmap poisoned".into())
                })?;
                let va = Var::from_tensor(&t_a)?;
                let vb = Var::from_tensor(&t_b)?;
                lock.insert(ia, va.clone());
                lock.insert(ib, vb.clone());
                lora_a.push(va);
                lora_b.push(vb);
            }
        }

        let pos = c.position() as usize;
        Ok((
            Self {
                varmap,
                lora_a,
                lora_b,
                d_model,
                rank,
                alpha,
                num_layers,
                device,
            },
            pos,
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn forward_output_shape_matches_d_model() -> Result<()> {
        let w = LoraWeights::new(512, 1, 4, 4.0)?;
        let x = Tensor::from_vec(vec![0.1f32; 512], (1, 512), &Device::Cpu)?;
        let y = w.forward(&x, 0)?;
        assert_eq!(y.dims(), &[1, 512]);
        Ok(())
    }

    #[test]
    fn to_bytes_from_bytes_roundtrip_weights() -> Result<()> {
        let w = LoraWeights::new(64, 2, 2, 4.0)?;
        let bytes = w.to_bytes()?;
        let (w2, _) = LoraWeights::from_bytes(&bytes)?;
        for layer in 0..2 {
            let (a1, b1) = w.weights_flat(layer)?;
            let (a2, b2) = w2.weights_flat(layer)?;
            assert_eq!(a1, a2, "layer {layer} A");
            assert_eq!(b1, b2, "layer {layer} B");
        }
        Ok(())
    }
}
