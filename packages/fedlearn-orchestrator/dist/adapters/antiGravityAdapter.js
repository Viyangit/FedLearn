export function createAntiGravityAdapter(generate) {
    return {
        async generate(input) {
            return generate(input);
        }
    };
}
