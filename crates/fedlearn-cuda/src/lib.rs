pub const DP_SGD_KERNEL_PATH: &str = "src/dp_sgd.cu";
pub const EWC_KERNEL_PATH: &str = "src/ewc.cu";
pub const LORA_MERGE_KERNEL_PATH: &str = "src/lora_merge.cu";

pub fn kernel_manifest() -> [&'static str; 3] {
    [DP_SGD_KERNEL_PATH, EWC_KERNEL_PATH, LORA_MERGE_KERNEL_PATH]
}

