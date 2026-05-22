import type { ModelAdapter } from "../types.js";
export declare function createCursorAdapter(generate: (input: {
    userInput: string;
    personalizationContext: string;
}) => Promise<string>): ModelAdapter;
