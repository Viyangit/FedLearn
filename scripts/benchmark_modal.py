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
    print(f"[benchmark_modal] wrote {benchmark_path}")
    print(f"[benchmark_modal] wrote {adversarial_path}")
    print(f"[benchmark_modal] wrote {non_iid_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

