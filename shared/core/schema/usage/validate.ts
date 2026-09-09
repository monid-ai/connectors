import type { UsageModel } from "./model/mod.ts";

/**
 * Counts ↔ model discipline (design D19) — ONE exhaustive switch, placed
 * beside the schema it interprets so every consumer shares it: the engine
 * (wrapping violations in FN_CONTRACT at settle AND estimate), the test
 * suites' card-invariant helpers, and later the services broker. Rules,
 * one per model kind:
 *   - PER_CALL  → counts must be {} (the flat charge is model + success —
 *     never a count);
 *   - PER_UNIT  → the single implied key is the model's unit;
 *   - COMPOSITE → every key names a PER_UNIT component (flat components
 *     never appear).
 * `{counts: {}}` passes everywhere. Returns the problem as a message
 * (undefined = ok) — the CALLER owns the error type.
 */
export function countsMismatch(
    model: UsageModel,
    counts: Record<string, number>,
): string | undefined {
    const keys = Object.keys(counts);
    switch (model.kind) {
        case "PER_CALL":
            return keys.length > 0
                ? `counts on a flat doc (${keys.join(", ")})`
                : undefined;
        case "PER_UNIT": {
            const bad = keys.find((key) => key !== model.unit);
            return bad !== undefined
                ? `leaf counts key "${bad}" ≠ the model's unit "${model.unit}"`
                : undefined;
        }
        case "COMPOSITE": {
            const bad = keys.find((key) =>
                model.components[key]?.kind !== "PER_UNIT"
            );
            return bad !== undefined
                ? `counts key "${bad}" names no metered component ` +
                    `(components: ${Object.keys(model.components).join(", ")})`
                : undefined;
        }
        default:
            // EXHAUSTIVENESS: adding a model kind fails `deno task check`
            // right here, before anything runs
            model satisfies never;
            return "unknown model kind";
    }
}
