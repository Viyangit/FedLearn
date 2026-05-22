export function createClaudeDesktopAdapter(generate) {
    return {
        async generate(input) {
            return generate(input);
        }
    };
}
