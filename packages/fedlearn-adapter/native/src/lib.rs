mod ewc;
mod lora;
mod trainer;

use std::io::Cursor;

use byteorder::{LittleEndian, ReadBytesExt, WriteBytesExt};
use candle_core::Result as CrResult;
use napi_derive::napi;

pub use ewc::EwcState;
use lora::LoraWeights;
pub use trainer::TrainSession;

fn map_candle(e: candle_core::Error) -> napi::Error {
    napi::Error::from_reason(e.to_string())
}

/// Full checkpoint: [`LoraWeights::to_bytes`] payload + `ewc_present` + optional JSON [`EwcState`].
fn serialize_checkpoint(session: &TrainSession) -> CrResult<Vec<u8>> {
    let mut out = session.weights.to_bytes()?;
    let has_ewc = session.ewc.num_layers > 0;
    out
        .write_u32::<LittleEndian>(u32::from(has_ewc))
        .map_err(|e| candle_core::Error::Msg(format!("write: {e}")))?;
    if has_ewc {
        let json = session
            .ewc
            .to_json_bytes()
            .map_err(|e| candle_core::Error::Msg(format!("json: {e}")))?;
        out
            .write_u32::<LittleEndian>(json.len() as u32)
            .map_err(|e| candle_core::Error::Msg(format!("write: {e}")))?;
        out.extend_from_slice(&json);
    }
    Ok(out)
}

fn deserialize_checkpoint(bytes: &[u8], lr: f32) -> CrResult<TrainSession> {
    let (weights, pos) = LoraWeights::from_bytes(bytes)?;
    let tail = bytes.get(pos..).ok_or_else(|| candle_core::Error::Msg("truncated".into()))?;
    let mut c = Cursor::new(tail);
    let flag = c
        .read_u32::<LittleEndian>()
        .map_err(|e| candle_core::Error::Msg(format!("ewc flag: {e}")))?;
    let ewc = if flag != 0 {
        let jlen = c
            .read_u32::<LittleEndian>()
            .map_err(|e| candle_core::Error::Msg(format!("json len: {e}")))? as usize;
        let start = c.position() as usize;
        let jbytes = tail
            .get(start..start + jlen)
            .ok_or_else(|| candle_core::Error::Msg("json bytes out of range".into()))?;
        EwcState::from_json_bytes(jbytes).map_err(|e| candle_core::Error::Msg(e.to_string()))?
    } else {
        EwcState::new(400.0)
    };
    TrainSession::new(weights, ewc, lr)
}

#[napi]
pub struct JsAdapter {
    session: TrainSession,
}

#[napi]
impl JsAdapter {
    #[napi(constructor)]
    pub fn new(
        d_model: u32,
        num_layers: u32,
        rank: u32,
        alpha: f64,
        ewc_lambda: f64,
        lr: f64,
    ) -> napi::Result<Self> {
        let weights =
            LoraWeights::new(d_model as usize, num_layers as usize, rank as usize, alpha as f32)
                .map_err(map_candle)?;
        let ewc = EwcState::new(ewc_lambda as f32);
        let session = TrainSession::new(weights, ewc, lr as f32).map_err(map_candle)?;
        Ok(Self { session })
    }

    #[napi]
    pub fn learn_turn(&mut self, input: Vec<f64>, target: Vec<f64>) -> napi::Result<f64> {
        let inf: Vec<f32> = input.iter().map(|&x| x as f32).collect();
        let tf: Vec<f32> = target.iter().map(|&x| x as f32).collect();
        let loss = self
            .session
            .train_step(&inf, &tf)
            .map_err(map_candle)?;
        Ok(loss as f64)
    }

    #[napi]
    pub fn consolidate(&mut self) -> napi::Result<()> {
        self.session.consolidate().map_err(map_candle)
    }

    #[napi]
    pub fn forward(&self, input: Vec<f64>, layer: u32) -> napi::Result<Vec<f64>> {
        let inf: Vec<f32> = input.iter().map(|&x| x as f32).collect();
        let t = self
            .session
            .forward_eval(&inf, layer as usize)
            .map_err(map_candle)?;
        let flat: Vec<f32> = t.flatten_all().map_err(map_candle)?.to_vec1().map_err(map_candle)?;
        Ok(flat.into_iter().map(|x: f32| x as f64).collect())
    }

    #[napi(getter)]
    pub fn turn_count(&self) -> u32 {
        self.session.turn_count() as u32
    }

    #[napi]
    pub fn to_bytes(&self) -> napi::Result<Vec<u8>> {
        serialize_checkpoint(&self.session).map_err(map_candle)
    }

    #[napi(factory)]
    pub fn from_bytes(bytes: Vec<u8>, lr: f64) -> napi::Result<Self> {
        let session = deserialize_checkpoint(&bytes, lr as f32).map_err(map_candle)?;
        Ok(Self { session })
    }

    #[napi(getter)]
    pub fn num_layers(&self) -> u32 {
        self.session.weights.num_layers as u32
    }

    #[napi(getter)]
    pub fn d_model(&self) -> u32 {
        self.session.weights.d_model as u32
    }
}
