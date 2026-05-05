use std::marker::PhantomData;

use serde::{Deserialize, Serialize};

use crate::adapter::lora::{LayerDelta, LoraAdapter, LoraDelta, Matrix};
use crate::session::ssc::SscEncoder;
use crate::FedLearnError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Interaction {
    pub input: String,
    pub output: String,
    pub loss: Option<f32>,
}

pub struct Session<'adapter> {
    pub(crate) adapter: &'adapter mut LoraAdapter,
    pub(crate) ssc_encoder: SscEncoder,
    pub(crate) session_id: String,
    pub(crate) interaction_count: usize,
    pub(crate) _volatile: PhantomData<*mut ()>,
}

impl LoraAdapter {
    pub fn begin_session(&mut self, session_id: impl Into<String>) -> Session<'_> {
        Session {
            adapter: self,
            ssc_encoder: SscEncoder::new(),
            session_id: session_id.into(),
            interaction_count: 0,
            _volatile: PhantomData,
        }
    }
}

impl<'adapter> Session<'adapter> {
    pub fn learn(&mut self, interactions: &[Interaction]) -> Result<(), FedLearnError> {
        if interactions.is_empty() {
            return Err(FedLearnError::EmptyInteractionStream);
        }
        for i in interactions {
            self.interaction_count += 1;
            self.ssc_encoder.learn_loss(i.loss.unwrap_or(0.0));
        }
        Ok(())
    }

    pub fn close(mut self) -> Result<LoraDelta, FedLearnError> {
        let emb = self.ssc_encoder.embedding();
        let mut deltas = Vec::with_capacity(self.adapter.layers.len());
        for l in &self.adapter.layers {
            let mut da = Matrix::zeros(l.a.rows, l.a.cols);
            let mut db = Matrix::zeros(l.b.rows, l.b.cols);
            let (da_proj, db_proj) = self
                .ssc_encoder
                .project_delta(&emb, da.data.len(), db.data.len());
            da.data.copy_from_slice(&da_proj);
            db.data.copy_from_slice(&db_proj);
            deltas.push(LayerDelta {
                layer_idx: l.layer_idx,
                da,
                db,
            });
        }

        self.adapter.session_count += 1;
        self.ssc_encoder.zero_state();

        Ok(LoraDelta {
            layers: deltas,
            session_id: self.session_id.clone(),
            privacy_cost: 0.0,
        })
    }

    pub fn interaction_count(&self) -> usize {
        self.interaction_count
    }
}

impl<'adapter> Drop for Session<'adapter> {
    fn drop(&mut self) {
        self.ssc_encoder.zero_state();
    }
}

