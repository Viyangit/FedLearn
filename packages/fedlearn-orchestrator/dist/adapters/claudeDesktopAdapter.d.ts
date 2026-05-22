import type { ModelAdapter } from "../types.js";
export declare function createClaudeDesktopAdapter(generate: (input: {
    userInput: string;
    personalizationContext: string;
}) => Promise<string>): ModelAdapter;
