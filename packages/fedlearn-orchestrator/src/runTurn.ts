import type { FlowLogEntry, RunTurnInput, RunTurnResult, ToolResponse } from "./types.js";

async function callWithRetry(
  stage: string,
  fn: () => Promise<ToolResponse>,
  maxRetries: number,
  retries: Record<string, number>,
  onLog?: (entry: FlowLogEntry) => void,
  turnId?: string
): Promise<{ ok: boolean; response: ToolResponse | null }> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    const start = Date.now();
    try {
      const response = await fn();
      retries[stage] = attempt;
      onLog?.({
        turnId: turnId ?? "unknown-turn",
        flowStage: stage as FlowLogEntry["flowStage"],
        success: true,
        latencyMs: Date.now() - start,
        retries: attempt
      });
      return { ok: true, response };
    } catch {
      onLog?.({
        turnId: turnId ?? "unknown-turn",
        flowStage: stage as FlowLogEntry["flowStage"],
        success: false,
        latencyMs: Date.now() - start,
        retries: attempt
      });
      attempt += 1;
    }
  }
  retries[stage] = maxRetries + 1;
  return { ok: false, response: null };
}

function firstText(response: ToolResponse | null): string {
  if (!response) return "";
  for (const item of response.content ?? []) {
    if (item.type === "text" && typeof item.text === "string") return item.text;
  }
  return "";
}

export async function runTurn(input: RunTurnInput): Promise<RunTurnResult> {
  const turnId = input.turnId ?? `${input.conversationId}-${Date.now()}`;
  const maxRetries = input.maxRetries ?? 1;
  const retries: Record<string, number> = {};

  const preTurn = await callWithRetry(
    "pre_turn",
    () =>
      input.mcp.callTool("pre_turn", {
        userId: input.userId,
        conversationId: input.conversationId,
        latestInput: input.userInput,
        turnId
      }),
    maxRetries,
    retries,
    input.onLog,
    turnId
  );

  const context = await callWithRetry(
    "get_personalization_context",
    () =>
      input.mcp.callTool("get_personalization_context", {
        userId: input.userId,
        conversationId: input.conversationId,
        latestInput: input.userInput,
        turnId
      }),
    maxRetries,
    retries,
    input.onLog,
    turnId
  );

  const contextText = context.ok
    ? firstText(context.response)
    : "Context unavailable. Use neutral response style.";
  const modelStart = Date.now();
  const reply = await input.modelAdapter.generate({
    userInput: input.userInput,
    personalizationContext: contextText
  });
  input.onLog?.({
    turnId,
    flowStage: "model_generate",
    success: true,
    latencyMs: Date.now() - modelStart,
    retries: 0
  });

  const learn = await callWithRetry(
    "learn_from_turn",
    () =>
      input.mcp.callTool("learn_from_turn", {
        userId: input.userId,
        conversationId: input.conversationId,
        input: input.userInput,
        output: reply,
        turnId
      }),
    maxRetries,
    retries,
    input.onLog,
    turnId
  );

  return {
    reply,
    telemetry: {
      turnId,
      preTurnOk: preTurn.ok,
      contextOk: context.ok,
      learnOk: learn.ok,
      retries,
      contextSnippet: contextText.slice(0, 200)
    }
  };
}

