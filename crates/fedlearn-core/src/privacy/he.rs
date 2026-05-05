use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeQuantizedGradient {
    pub scale: f32,
    pub values: Vec<i16>,
}

pub fn quantize_for_he(gradient: &[f32], scale: f32) -> HeQuantizedGradient {
    let s = if scale <= 0.0 { 1.0 } else { scale };
    let values = gradient
        .iter()
        .map(|g| (g * s).round().clamp(i16::MIN as f32, i16::MAX as f32) as i16)
        .collect();
    HeQuantizedGradient { scale: s, values }
}

pub fn dequantize_from_he(q: &HeQuantizedGradient) -> Vec<f32> {
    q.values.iter().map(|v| *v as f32 / q.scale).collect()
}

