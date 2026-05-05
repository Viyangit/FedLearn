extern "C" __global__ void dp_sgd_fused(
    const float* grads,
    float* out,
    const float clip_norm,
    const float noise_sigma,
    const int batch_size,
    const int param_dim
) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= param_dim) return;
    float sum = 0.0f;
    for (int b = 0; b < batch_size; b++) {
        sum += grads[b * param_dim + idx];
    }
    out[idx] = (sum / batch_size) + noise_sigma * clip_norm;
}

