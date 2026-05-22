export function createCursorAdapter(generate) {
    return {
        async generate(input) {
            return generate(input);
        }
    };
}
