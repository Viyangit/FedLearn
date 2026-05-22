import type { ModelAdapter } from "../types.js";

export function createAntiGravityAdapter(
  generate: (input: { userInput: string; personalizationContext: string }) => Promise<string>
): ModelAdapter {
  return {
    async generate(input) {
      return generate(input);
    }
  };
}

