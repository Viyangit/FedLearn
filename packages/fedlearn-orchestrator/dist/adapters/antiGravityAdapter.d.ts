import type { ModelAdapter } from "../types.js";
export declare function createAntiGravityAdapter(generate: (input: {
    userInput: string;
    personalizationContext: string;
}) => Promise<string>): ModelAdapter;
