use chacha20::cipher::{KeyIvInit, StreamCipher};
use hkdf::Hkdf;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use x25519_dalek::{PublicKey, StaticSecret};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecAggParticipant {
    pub device_id: String,
    pub private_seed: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaskedUpdate {
    pub device_id: String,
    pub masked: Vec<f32>,
}

fn private_key_from_seed(seed: u64) -> StaticSecret {
    let hk = Hkdf::<Sha256>::new(None, &seed.to_le_bytes());
    let mut key = [0_u8; 32];
    hk.expand(b"fedlearn-secagg-seed", &mut key)
        .expect("seed expand");
    StaticSecret::from(key)
}

fn pairwise_mask(seed_a: u64, seed_b: u64, len: usize) -> Vec<f32> {
    let sk_a = private_key_from_seed(seed_a);
    let sk_b = private_key_from_seed(seed_b);
    let pk_b = PublicKey::from(&sk_b);
    let shared = sk_a.diffie_hellman(&pk_b);

    let hk = Hkdf::<Sha256>::new(None, shared.as_bytes());
    let mut key = [0_u8; 32];
    let mut nonce = [0_u8; 12];
    hk.expand(b"fedlearn-mask-key", &mut key).expect("mask key");
    hk.expand(b"fedlearn-mask-nonce", &mut nonce).expect("mask nonce");

    let mut stream = vec![0_u8; len * 4];
    let mut cipher = chacha20::ChaCha20::new((&key).into(), (&nonce).into());
    cipher.apply_keystream(&mut stream);

    stream
        .chunks_exact(4)
        .map(|c| {
            let mut b = [0_u8; 4];
            b.copy_from_slice(c);
            let x = u32::from_le_bytes(b);
            (x as f32 / u32::MAX as f32 - 0.5) * 1e-3
        })
        .collect()
}

pub fn mask_update(
    me: &SecAggParticipant,
    peers: &[SecAggParticipant],
    gradient: &[f32],
) -> MaskedUpdate {
    let mut out = gradient.to_vec();
    for p in peers {
        if p.device_id == me.device_id {
            continue;
        }
        let m = pairwise_mask(me.private_seed, p.private_seed, gradient.len());
        if me.device_id < p.device_id {
            for (i, v) in m.iter().enumerate() {
                out[i] += *v;
            }
        } else {
            for (i, v) in m.iter().enumerate() {
                out[i] -= *v;
            }
        }
    }
    MaskedUpdate {
        device_id: me.device_id.clone(),
        masked: out,
    }
}

pub fn aggregate_masked(updates: &[MaskedUpdate]) -> Vec<f32> {
    if updates.is_empty() {
        return vec![];
    }
    let len = updates[0].masked.len();
    let mut out = vec![0.0_f32; len];
    for u in updates {
        for (i, v) in u.masked.iter().enumerate() {
            out[i] += *v;
        }
    }
    out
}

