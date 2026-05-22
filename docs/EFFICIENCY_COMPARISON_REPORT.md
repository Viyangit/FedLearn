# Efficiency comparison — FedLearn-shaped workloads vs baselines

**Scope.** This compares *microbenchmarks inside* `scripts/benchmark_modal.py` on this machine.
`cargo test` and `npm test` are **correctness checks**; they do not measure throughput.

**Caveats.** Workloads are **proxies**, not production training loops, servers, crypto,
or WASM. Treat ratios as illustrative of relative cost *of each isolated pattern*,
not as end-to-end product SLAs.

**Timing:** `time.perf_counter()`, **iterations per workload:** 50.

| Module pattern | FedLearn-shaped (mean ms) | Baseline (mean ms) | Ratio (Fed / base) | Overhead vs baseline |
|----------------|---------------------------|--------------------|--------------------|----------------------|
| DP-style average (+ clipping FedLearn-shaped) | 1.1736 | 0.6404 | 1.833x | +83.3% |
| EWC-shaped penalty (Fisher-weighted) | 0.1158 | 0.0833 | 1.390x | +39.0% |
| LoRA low-rank merge (matmul + implied adapter path) | 2.9852 | 0.2082 | 14.340x | +1334.0% |

**Note (LoRA row).** The baseline sums a dense-shaped buffer without a rank-`r` matmul;
it is a *lower-bound reference*, not an alternative with identical modeling capacity.
Expect a large Fed/baseline ratio; production comparisons should pair against a workload
with matched output shape and realistic dense vs low-rank FLOPs.

## How to reproduce

```bash
python3 scripts/benchmark_modal.py --iters 50 --out-dir artifacts/efficiency \
  --write-efficiency-report docs/EFFICIENCY_COMPARISON_REPORT.md
```

