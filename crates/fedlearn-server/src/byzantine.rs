use std::collections::HashSet;

use fedlearn_core::crypto::sketch::cosine_similarity;

pub fn filter_by_sketch_consensus(
    device_ids: &[String],
    sketches: &[Vec<f32>],
    threshold: f32,
) -> HashSet<String> {
    let mut allowed = HashSet::new();
    if device_ids.is_empty() || sketches.is_empty() || device_ids.len() != sketches.len() {
        return allowed;
    }

    for i in 0..device_ids.len() {
        let mut sum = 0.0_f32;
        let mut count = 0_u32;
        for j in 0..device_ids.len() {
            if i == j {
                continue;
            }
            sum += cosine_similarity(&sketches[i], &sketches[j]);
            count += 1;
        }
        let mean = if count == 0 { 1.0 } else { sum / count as f32 };
        if mean >= threshold {
            allowed.insert(device_ids[i].clone());
        }
    }

    allowed
}

