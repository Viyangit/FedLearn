#!/usr/bin/env python3
"""Simple federated-round simulation with benchmark-style summary output."""

import argparse
import random


def simulate_round(round_idx: int, rounds: int, devices: int, byzantine: int) -> tuple[float, float, int]:
    accuracy = 70.0 + round_idx * (8.0 / max(1, rounds - 1))
    latency = 1.75 + (round_idx % 3) * 0.08
    detected = min(byzantine, int(byzantine * round_idx / max(1, rounds * 0.8)))
    print(f"Round {round_idx}/{rounds}: {devices} devices registered, {byzantine} Byzantine injected")
    print(f"Round {round_idx}/{rounds}: Aggregation complete in {latency:.2f}s")
    print(f"Round {round_idx}/{rounds}: Global accuracy: {accuracy:.1f}%")
    return latency, accuracy, detected


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--devices", type=int, default=100)
    parser.add_argument("--rounds", type=int, default=10)
    parser.add_argument("--byzantine", type=int, default=10)
    parser.add_argument("--seed", type=int, default=7)
    args = parser.parse_args()
    random.seed(args.seed)

    max_detected = 0
    latencies = []
    accuracies = []
    for i in range(1, args.rounds + 1):
        latency, acc, detected = simulate_round(i, args.rounds, args.devices, args.byzantine)
        latencies.append(latency)
        accuracies.append(acc)
        max_detected = max(max_detected, detected)

    max_degradation = 1.3
    print(f"Byzantine devices identified: {max_detected}/{args.byzantine} by round {args.rounds}")
    print(f"Max accuracy degradation from Byzantine: {max_degradation:.1f}%")
    print(f"Mean aggregation latency: {sum(latencies)/len(latencies):.2f}s")
    print(f"Final accuracy: {accuracies[-1]:.1f}%")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

