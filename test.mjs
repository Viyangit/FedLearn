import {
  formatEpsilon,
  buildHeatMapModel,
  normalizeIntensity,
  LocalAdapter,
  toggleContributions
} from "fedlearn-core";

console.log("epsilon:", formatEpsilon({ consumed: 0.25, total: 1.0 }));
console.log("heatmap:", normalizeIntensity(buildHeatMapModel([[1, 2]])).cells);
const adapter = await LocalAdapter.load("cli-user");
const session = adapter.beginSession("cli-session");
await session.learn([{ input: "hello", output: "world", loss: 0.2 }]);
await adapter.apply(await session.close());
console.log("snapshot:", adapter.snapshot());
console.log("toggle:", toggleContributions({ contributionEnabled: true, pausedAtMs: null }, Date.now()));
