extern "C" __global__ void lora_merge(
    const float* A,
    const float* B,
    const float* W,
    float* W_out,
    const int d, const int r, const int k
) {
    int row = blockIdx.y * blockDim.y + threadIdx.y;
    int col = blockIdx.x * blockDim.x + threadIdx.x;
    if (row >= d || col >= k) return;
    float ab = 0.0f;
    for (int i = 0; i < r; i++) {
        ab += A[row * r + i] * B[i * k + col];
    }
    W_out[row * k + col] = W[row * k + col] + ab;
}

