export type ToolResponse = {
  content: Array<{ type: string; text?: string }>;
  [key: string]: unknown;
};

export interface McpToolCaller {
  callTool(name: string, args: Record<string, unknown>): Promise<ToolResponse>;
}

export interface ModelAdapter {
  generate(input: { userInput: string; personalizationContext: string }): Promise<string>;
}

export interface RunTurnInput {
  userId: string;
  conversationId: string;
  userInput: string;
  modelAdapter: ModelAdapter;
  mcp: McpToolCaller;
  turnId?: string;
  maxRetries?: number;
  onLog?: (entry: FlowLogEntry) => void;
}

export interface FlowLogEntry {
  turnId: string;
  flowStage: "pre_turn" | "get_personalization_context" | "model_generate" | "learn_from_turn";
  success: boolean;
  latencyMs: number;
  retries: number;
}

export interface RunTurnResult {
  reply: string;
  telemetry: {
    turnId: string;
    preTurnOk: boolean;
    contextOk: boolean;
    learnOk: boolean;
    retries: Record<string, number>;
    contextSnippet: string;
  };
}

