use std::collections::{HashMap, HashSet};

use crate::byzantine::filter_by_sketch_consensus;
use crate::trust::TrustRegistry;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum RoundState {
    Waiting,
    Registering,
    Collecting,
    Filtering,
    Aggregating,
    Distributing,
    Complete,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceSubmission {
    pub device_id: String,
    pub masked_gradient: Vec<f32>,
    pub sketch: Vec<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoundManager {
    pub round_id: Option<Uuid>,
    pub state: RoundState,
    participants: HashSet<String>,
    submissions: HashMap<String, DeviceSubmission>,
    soft_labels: HashMap<String, Vec<f32>>,
}

impl RoundManager {
    pub fn new() -> Self {
        Self {
            round_id: None,
            state: RoundState::Waiting,
            participants: HashSet::new(),
            submissions: HashMap::new(),
            soft_labels: HashMap::new(),
        }
    }

    pub fn start_round(&mut self) -> Uuid {
        let round_id = Uuid::new_v4();
        self.round_id = Some(round_id);
        self.state = RoundState::Registering;
        self.participants.clear();
        self.submissions.clear();
        self.soft_labels.clear();
        round_id
    }

    pub fn register_device(&mut self, device_id: &str) {
        if self.state == RoundState::Registering {
            self.participants.insert(device_id.to_string());
        }
    }

    pub fn begin_collection(&mut self) {
        if self.state == RoundState::Registering && !self.participants.is_empty() {
            self.state = RoundState::Collecting;
        }
    }

    pub fn submit_update(&mut self, submission: DeviceSubmission) {
        if self.state == RoundState::Collecting && self.participants.contains(&submission.device_id) {
            self.submissions
                .insert(submission.device_id.clone(), submission);
        }
    }

    pub fn begin_filtering(&mut self) {
        if self.state == RoundState::Collecting && !self.submissions.is_empty() {
            self.state = RoundState::Filtering;
        }
    }

    pub fn begin_aggregation(&mut self) {
        if self.state == RoundState::Filtering && !self.submissions.is_empty() {
            self.state = RoundState::Aggregating;
        }
    }

    pub fn begin_distribution(&mut self) {
        if self.state == RoundState::Aggregating {
            self.state = RoundState::Distributing;
        }
    }

    pub fn complete_round(&mut self) {
        if self.state == RoundState::Distributing {
            self.state = RoundState::Complete;
        }
    }

    pub fn submission_count(&self) -> usize {
        self.submissions.len()
    }

    pub fn participant_count(&self) -> usize {
        self.participants.len()
    }

    pub fn submit_soft_labels(&mut self, device_id: String, labels: Vec<f32>) {
        if self.state == RoundState::Collecting && self.participants.contains(&device_id) {
            self.soft_labels.insert(device_id, labels);
        }
    }

    pub fn aggregate_soft_labels(&self) -> Option<Vec<f32>> {
        if self.soft_labels.is_empty() {
            return None;
        }
        let len = self.soft_labels.values().next()?.len();
        let mut out = vec![0.0_f32; len];
        for labels in self.soft_labels.values() {
            for (i, v) in labels.iter().enumerate() {
                out[i] += *v;
            }
        }
        let n = self.soft_labels.len() as f32;
        for v in &mut out {
            *v /= n;
        }
        Some(out)
    }

    pub fn aggregate_filtered_weighted(
        &self,
        trust: &TrustRegistry,
        threshold: f32,
        temperature: f32,
    ) -> Vec<f32> {
        if self.submissions.is_empty() {
            return vec![];
        }
        let ids: Vec<String> = self.submissions.keys().cloned().collect();
        let sketches: Vec<Vec<f32>> = ids
            .iter()
            .map(|id| self.submissions.get(id).map(|s| s.sketch.clone()).unwrap_or_default())
            .collect();
        let allowed = filter_by_sketch_consensus(&ids, &sketches, threshold);
        let filtered_ids: Vec<String> = ids
            .into_iter()
            .filter(|id| allowed.contains(id) && !trust.is_banned(id))
            .collect();
        if filtered_ids.is_empty() {
            return vec![];
        }
        let weights = trust.normalized_weights(&filtered_ids, temperature);
        let len = self
            .submissions
            .get(&filtered_ids[0])
            .map(|s| s.masked_gradient.len())
            .unwrap_or(0);
        let mut out = vec![0.0_f32; len];
        for id in filtered_ids {
            if let Some(sub) = self.submissions.get(&id) {
                let w = *weights.get(&id).unwrap_or(&0.0);
                for (i, v) in sub.masked_gradient.iter().enumerate() {
                    out[i] += w * v;
                }
            }
        }
        out
    }
}

