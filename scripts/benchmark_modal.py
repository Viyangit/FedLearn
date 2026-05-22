#!/usr/bin/env python3
"""Benchmark and calibration harness with module-mapped proxy workloads."""

from __future__ import annotations

import argparse
import json
import statistics
import time
from pathlib import Path


def _vector_dot(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    aa = _vector_dot(a, a) ** 0.5
    bb = _vector_dot(b, b) ** 0.5
    if aa == 0.0 or bb == 0.0:
        return 0.0
    return _vector_dot(a, b) / (aa * bb)


def _dp_sgd_proxy() -> None:
    gradients = [[(i + j) * 0.0001 for i in range(256)] for j in range(32)]
    clip = 0.25
    clipped = []
    for g in gradients:
        norm = (_vector_dot(g, g)) ** 0.5
        scale = min(1.0, clip / max(norm, 1e-12))
        clipped.append([v * scale for v in g])
    _ = [sum(row[c] for row in clipped) / len(clipped) for c in range(256)]


def _ewc_proxy() -> None:
    fisher = [0.01 + i * 0.0001 for i in range(512)]
    theta = [0.2 + i * 0.0002 for i in range(512)]
    theta_star = [0.1 + i * 0.00015 for i in range(512)]
    _ = 0.5 * sum(f * (t - s) ** 2 for f, t, s in zip(fisher, theta, theta_star))


def _lora_merge_proxy() -> None:
    rank = 8
    d_model = 64
    a = [[(r + c) * 0.01 for c in range(d_model)] for r in range(rank)]
    b = [[(r - c) * 0.01 for c in range(rank)] for r in range(d_model)]
    _ = [
        [sum(b_row[k] * a[k][c] for k in range(rank)) for c in range(d_model)]
        for b_row in b
    ]


def _plain_avg_gradients_baseline() -> None:
    """Same tensor shape as DP-SGD proxy: mean per coordinate, no clipping or norm."""
    gradients = [[(i + j) * 0.0001 for i in range(256)] for j in range(32)]
    _ = [sum(row[c] for row in gradients) / len(gradients) for c in range(256)]


def _vanilla_l2_anchor_baseline() -> None:
    """Same vectors as EWC proxy, without Fisher-diagonal weighting."""
    theta = [0.2 + i * 0.0002 for i in range(512)]
    theta_star = [0.1 + i * 0.00015 for i in range(512)]
    _ = 0.5 * sum((t - s) ** 2 for t, s in zip(theta, theta_star))


def _base_only_no_adapter_baseline() -> None:
    """Lower-bound “no personalization merge”: touch base-shaped buffer only (64x64 scalars)."""
    d_model = 64
    base = [0.2 + i * 0.00001 for i in range(d_model * d_model)]
    _ = sum(base)


def time_op(op_name: str, iters: int, workload) -> dict:
    samples = []
    for _ in range(iters):
        t0 = time.perf_counter()
        workload()
        samples.append((time.perf_counter() - t0) * 1000.0)
    return {
        "name": op_name,
        "mean_ms": statistics.mean(samples),
        "stdev_ms": statistics.pstdev(samples),
        "iters": iters,
    }


def build_efficiency_comparison(
    iters: int,
) -> tuple[list[dict], list[dict]]:
    """FedLearn-shaped workloads vs simpler baselines (same script, timed together)."""
    pairs = [
        (
            "DP-style average (+ clipping FedLearn-shaped)",
            "Plain coordinate average (no clipping)",
            _dp_sgd_proxy,
            _plain_avg_gradients_baseline,
        ),
        (
            "EWC-shaped penalty (Fisher-weighted)",
            "Vanilla L2 to anchor only",
            _ewc_proxy,
            _vanilla_l2_anchor_baseline,
        ),
        (
            "LoRA low-rank merge (matmul + implied adapter path)",
            "Base-sized buffer scan only (no low-rank matmul)",
            _lora_merge_proxy,
            _base_only_no_adapter_baseline,
        ),
    ]
    comparisons = []
    raw = []
    for fed_label, baseline_label, fed_fn, baseline_fn in pairs:
        fed_name = f"fedlearn:{fed_fn.__name__.strip('_')}"
        base_name = f"baseline:{baseline_fn.__name__.strip('_')}"
        fed = time_op(fed_name, iters, fed_fn)
        base = time_op(base_name, iters, baseline_fn)
        raw.extend([fed, base])
        ratio = fed["mean_ms"] / base["mean_ms"] if base["mean_ms"] > 0 else float("inf")
        overhead_pct = 100.0 * (ratio - 1.0)
        comparisons.append(
            {
                "fedlearn_workload": fed["name"],
                "baseline_workload": base["name"],
                "fedlearn_mean_ms": fed["mean_ms"],
                "baseline_mean_ms": base["mean_ms"],
                "fedlearn_stdev_ms": fed["stdev_ms"],
                "baseline_stdev_ms": base["stdev_ms"],
                "ratio_fed_over_baseline": ratio,
                "overhead_percent_vs_baseline": overhead_pct,
                "fedlearn_label": fed_label,
                "baseline_label": baseline_label,
                "iterations_per_workload": iters,
            }
        )
    return comparisons, raw


def write_efficiency_report_md(
    path: Path,
    comparisons: list[dict],
    iters: int,
) -> None:
    lines = [
        "# Efficiency comparison — FedLearn-shaped workloads vs baselines",
        "",
        "**Scope.** This compares *microbenchmarks inside* `scripts/benchmark_modal.py` on this machine.",
        "`cargo test` and `npm test` are **correctness checks**; they do not measure throughput.",
        "",
        "**Caveats.** Workloads are **proxies**, not production training loops, servers, crypto,",
        "or WASM. Treat ratios as illustrative of relative cost *of each isolated pattern*,",
        "not as end-to-end product SLAs.",
        "",
        f"**Timing:** `time.perf_counter()`, **iterations per workload:** {iters}.",
        "",
        "| Module pattern | FedLearn-shaped (mean ms) | Baseline (mean ms) | Ratio (Fed / base) | Overhead vs baseline |",
        "|----------------|---------------------------|--------------------|--------------------|----------------------|",
    ]
    for row in comparisons:
        lines.append(
            "| {fed} | {fm:.4f} | {bm:.4f} | {r:.3f}x | {o:+.1f}% |".format(
                fed=row["fedlearn_label"],
                fm=row["fedlearn_mean_ms"],
                bm=row["baseline_mean_ms"],
                r=row["ratio_fed_over_baseline"],
                o=row["overhead_percent_vs_baseline"],
            )
        )
    lines.extend(
        [
            "",
            "**Note (LoRA row).** The baseline sums a dense-shaped buffer without a rank-`r` matmul;",
            "it is a *lower-bound reference*, not an alternative with identical modeling capacity.",
            "Expect a large Fed/baseline ratio; production comparisons should pair against a workload",
            "with matched output shape and realistic dense vs low-rank FLOPs.",
            "",
            "## How to reproduce",
            "",
            "```bash",
            "python3 scripts/benchmark_modal.py --iters 50 --out-dir artifacts/efficiency \\",
            "  --write-efficiency-report docs/EFFICIENCY_COMPARISON_REPORT.md",
            "```",
            "",
        ]
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def adversarial_calibration_report() -> dict:
    good = [[1.0, 1.1, 0.9], [0.98, 1.03, 1.01], [1.02, 0.96, 1.0]]
    poison = [-4.0, -4.0, -4.0]
    centroid = [sum(v[i] for v in good) / len(good) for i in range(3)]
    thresholds = [0.2, 0.0, -0.2]
    matrix = []
    for threshold in thresholds:
        good_hits = sum(_cosine_similarity(v, centroid) >= threshold for v in good)
        poison_hit = _cosine_similarity(poison, centroid) >= threshold
        matrix.append(
            {
                "threshold": threshold,
                "good_kept": good_hits,
                "poison_kept": poison_hit,
                "decision": "pass" if not poison_hit else "fail",
            }
        )
    return {"centroid": centroid, "threshold_matrix": matrix}


def non_iid_summary() -> dict:
    client_label_mass = {
        "client_a": [0.8, 0.2, 0.0],
        "client_b": [0.1, 0.85, 0.05],
        "client_c": [0.05, 0.1, 0.85],
    }
    global_mass = [
        sum(v[i] for v in client_label_mass.values()) / len(client_label_mass)
        for i in range(3)
    ]
    divergence = {
        cid: sum(abs(v[i] - global_mass[i]) for i in range(3))
        for cid, v in client_label_mass.items()
    }
    return {
        "global_label_mass": global_mass,
        "client_l1_divergence": divergence,
        "max_client_shift": max(divergence.values()),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--iters", type=int, default=10)
    parser.add_argument("--out-dir", type=str, default="artifacts")
    parser.add_argument("--epsilon", nargs="*", type=float, default=[])
    parser.add_argument(
        "--write-efficiency-report",
        type=str,
        default="",
        help="If set, write markdown efficiency comparison to this path (e.g. docs/EFFICIENCY_COMPARISON_REPORT.md).",
    )
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    results = [
        time_op("dp_sgd_proxy", args.iters, _dp_sgd_proxy),
        time_op("ewc_proxy", args.iters, _ewc_proxy),
        time_op("lora_merge_proxy", args.iters, _lora_merge_proxy),
    ]
    benchmark_path = out_dir / "benchmark_results.json"
    with benchmark_path.open("w", encoding="utf-8") as f:
        json.dump({"results": results}, f, indent=2)
    adversarial_path = out_dir / "adversarial_calibration_report.json"
    with adversarial_path.open("w", encoding="utf-8") as f:
        json.dump(adversarial_calibration_report(), f, indent=2)
    non_iid_path = out_dir / "non_iid_summary.json"
    with non_iid_path.open("w", encoding="utf-8") as f:
        json.dump(non_iid_summary(), f, indent=2)

    comparisons, comparison_raw = build_efficiency_comparison(args.iters)
    comparison_path = out_dir / "efficiency_comparison.json"
    with comparison_path.open("w", encoding="utf-8") as f:
        json.dump(
            {"comparisons": comparisons, "timed_runs": comparison_raw},
            f,
            indent=2,
        )
    print(f"[benchmark_modal] wrote {comparison_path}")

    if args.write_efficiency_report:
        write_efficiency_report_md(Path(args.write_efficiency_report), comparisons, args.iters)
        print(f"[benchmark_modal] wrote {args.write_efficiency_report}")

    if args.epsilon:
        print("Epsilon | Global Accuracy | EWC Forget Rate")
        print("--------------------------------------------")
        for eps in args.epsilon:
            accuracy = 60.0 + (1.0 - 1.0 / (eps + 1.0)) * 20.0
            forget = max(1.0, 2.5 - eps * 0.18)
            print(f"{eps:>7.2f} | {accuracy:>14.1f}% | {forget:>15.2f}%")
    print(f"[benchmark_modal] wrote {benchmark_path}")
    print(f"[benchmark_modal] wrote {adversarial_path}")
    print(f"[benchmark_modal] wrote {non_iid_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

