use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;

use crate::FedLearnError;

type HmacSha256 = Hmac<Sha256>;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BudgetState {
    pub total_epsilon: f64,
    pub consumed_epsilon: f64,
    pub round_count: u64,
    pub hmac: [u8; 32],
}

impl BudgetState {
    pub fn new(total_epsilon: f64) -> Self {
        Self {
            total_epsilon,
            consumed_epsilon: 0.0,
            round_count: 0,
            hmac: [0; 32],
        }
    }

    pub fn sign(&mut self, secret: &[u8]) {
        let mut mac = HmacSha256::new_from_slice(secret).expect("HMAC key");
        mac.update(&self.total_epsilon.to_le_bytes());
        mac.update(&self.consumed_epsilon.to_le_bytes());
        mac.update(&self.round_count.to_le_bytes());
        let out = mac.finalize().into_bytes();
        self.hmac.copy_from_slice(&out[..32]);
    }

    pub fn verify(&self, secret: &[u8]) -> Result<(), FedLearnError> {
        let mut temp = self.clone();
        temp.sign(secret);
        if temp.hmac == self.hmac {
            Ok(())
        } else {
            Err(FedLearnError::BudgetTampered)
        }
    }
}

