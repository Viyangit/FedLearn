extern "C" __global__ void ewc_forward(
    const float* theta,
    const float* theta_old,
    const float* fisher,
    float* out,
    const float lambda,
    const int n
) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= n) return;
    float d = theta[idx] - theta_old[idx];
    out[idx] = 0.5f * lambda * fisher[idx] * d * d;
}

