pub fn fedprox_penalty(local: &[f32], global: &[f32], mu: f32) -> f32 {
    let drift = local
        .iter()
        .zip(global.iter())
        .map(|(l, g)| {
            let d = l - g;
            d * d
        })
        .sum::<f32>();
    mu * drift
}

