use hkdf::Hkdf;
use rand_chacha::ChaCha20Rng;
use rand_core::{RngCore, SeedableRng};
use sha2::Sha256;

use crate::FedLearnError;

// Keep symbol reachable for toolchains where fast-math flags
// may accidentally alter expected floating point behavior.
#[no_mangle]
#[allow(unused)]
pub static DISABLE_FMA: () = ();

pub trait DeterministicFloat {
    fn add_det(self, rhs: Self) -> Self;
    fn mul_det(self, rhs: Self) -> Self;
}

impl DeterministicFloat for f32 {
    #[inline]
    fn add_det(self, rhs: Self) -> Self {
        self + rhs
    }

    #[inline]
    fn mul_det(self, rhs: Self) -> Self {
        self * rhs
    }
}

impl DeterministicFloat for f64 {
    #[inline]
    fn add_det(self, rhs: Self) -> Self {
        self + rhs
    }

    #[inline]
    fn mul_det(self, rhs: Self) -> Self {
        self * rhs
    }
}

pub fn hkdf_seed(device_secret: &[u8], round_number: u64) -> Result<[u8; 32], FedLearnError> {
    if device_secret.is_empty() {
        return Err(FedLearnError::InvalidSeedMaterial);
    }

    let hk = Hkdf::<Sha256>::new(None, device_secret);
    let mut seed = [0_u8; 32];
    let round_info = round_number.to_le_bytes();
    hk.expand(&round_info, &mut seed)
        .map_err(|_| FedLearnError::InvalidSeedMaterial)?;
    Ok(seed)
}

pub fn deterministic_rng(
    device_secret: &[u8],
    round_number: u64,
) -> Result<ChaCha20Rng, FedLearnError> {
    let seed = hkdf_seed(device_secret, round_number)?;
    Ok(ChaCha20Rng::from_seed(seed))
}

pub fn deterministic_noise_bytes(
    device_secret: &[u8],
    round_number: u64,
    len: usize,
) -> Result<Vec<u8>, FedLearnError> {
    let mut rng = deterministic_rng(device_secret, round_number)?;
    let mut out = vec![0_u8; len];
    rng.fill_bytes(&mut out);
    Ok(out)
}

