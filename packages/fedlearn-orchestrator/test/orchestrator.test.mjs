import test from "node:test";
import assert from "node:assert/strict";

import {
  createAntiGravityAdapter,
  createClaudeDesktopAdapter,
  createCursorAdapter,
  runTurn
} from "../dist/index.js";

function makeFakeMcp() {
  let sessions = 0;
  let epsilon = 0;
  let learnCount = 0;
  const callCounts = {
    pre_turn: 0,
    get_personalization_context: 0,
    learn_from_turn: 0
  };
  return {
    async callTool(name, args) {
      callCounts[name] += 1;
      if (name === "pre_turn") {
        return { content: [{ type: "text", text: JSON.stringify({ ok: true, args }) }] };
      }
      if (name === "get_personalization_context") {
        return { content: [{ type: "text", text: "style: concise, direct" }] };
      }
      if (name === "learn_from_turn") {
        learnCount += 1;
        sessions += 1;
        epsilon = Number((epsilon + 0.01).toFixed(2));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ learnCount, sessions, epsilon, turnId: args.turnId })
            }
          ]
        };
      }
      throw new Error(`Unknown tool: ${name}`);
    },
    state() {
      return { sessions, epsilon, learnCount, callCounts };
    }
  };
}

function modelFactory(tag) {
  return async ({ userInput, personalizationContext }) => `${tag}:${userInput}|${personalizationContext}`;
}

async function runTenTurnsWithAdapter(adapterFactory, tag) {
  const mcp = makeFakeMcp();
  const logs = [];
  const adapter = adapterFactory(modelFactory(tag));
  for (let i = 1; i <= 10; i += 1) {
    const result = await runTurn({
      userId: "check-five",
      conversationId: `${tag}-conv`,
      userInput: `msg-${i}`,
      modelAdapter: adapter,
      mcp,
      turnId: `${tag}-turn-${i}`,
      onLog: (entry) => logs.push(entry)
    });
    assert.equal(result.telemetry.preTurnOk, true);
    assert.equal(result.telemetry.contextOk, true);
    assert.equal(result.telemetry.learnOk, true);
  }
  return { mcpState: mcp.state(), logs };
}

test("cursor adapter deterministic 10-turn flow", async () => {
  const { mcpState, logs } = await runTenTurnsWithAdapter(createCursorAdapter, "cursor");
  assert.equal(mcpState.callCounts.pre_turn, 10);
  assert.equal(mcpState.callCounts.get_personalization_context, 10);
  assert.equal(mcpState.callCounts.learn_from_turn, 10);
  assert.equal(mcpState.sessions, 10);
  assert.equal(mcpState.epsilon, 0.1);
  assert.equal(logs.length, 40);
});

test("claude desktop adapter deterministic 10-turn flow", async () => {
  const { mcpState } = await runTenTurnsWithAdapter(createClaudeDesktopAdapter, "claude");
  assert.equal(mcpState.callCounts.pre_turn, 10);
  assert.equal(mcpState.callCounts.get_personalization_context, 10);
  assert.equal(mcpState.callCounts.learn_from_turn, 10);
  assert.equal(mcpState.sessions, 10);
  assert.equal(mcpState.epsilon, 0.1);
});

test("anti gravity adapter deterministic 10-turn flow", async () => {
  const { mcpState } = await runTenTurnsWithAdapter(createAntiGravityAdapter, "antigravity");
  assert.equal(mcpState.callCounts.pre_turn, 10);
  assert.equal(mcpState.callCounts.get_personalization_context, 10);
  assert.equal(mcpState.callCounts.learn_from_turn, 10);
  assert.equal(mcpState.sessions, 10);
  assert.equal(mcpState.epsilon, 0.1);
});

test("retries once and preserves learn call", async () => {
  const seen = { pre: 0 };
  const mcp = {
    async callTool(name) {
      if (name === "pre_turn") {
        seen.pre += 1;
        if (seen.pre === 1) throw new Error("temporary");
        return { content: [{ type: "text", text: "ok" }] };
      }
      if (name === "get_personalization_context") {
        return { content: [{ type: "text", text: "ctx" }] };
      }
      if (name === "learn_from_turn") {
        return { content: [{ type: "text", text: "learned" }] };
      }
      throw new Error("unknown tool");
    }
  };
  const out = await runTurn({
    userId: "check-five",
    conversationId: "retry-conv",
    userInput: "hello",
    modelAdapter: createCursorAdapter(async () => "reply"),
    mcp,
    turnId: "retry-turn-1"
  });
  assert.equal(out.telemetry.preTurnOk, true);
  assert.equal(out.telemetry.retries.pre_turn, 1);
  assert.equal(out.telemetry.learnOk, true);
});

