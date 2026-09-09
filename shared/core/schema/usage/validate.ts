import type { UsageModel } from "./model/mod.ts";

/** The reserved counts key for a LEAF PER_CALL model's flat charge (design
 *  D24). Deliberately NOT in the `Unit` vocabulary — units are countable
 *  quantities; CALL is the reserved flat key. Composite flat components
 *  key by their own component id instead. */
export const CALL_KEY = "CALL";

/**
 * The model's FLAT quantity vector (design D24): every PER_CALL charge is
 * exactly 1 per successful run — a constant the model already states, so
 * the ENGINE appends it to the fn-returned usage at estimate AND success
 * settle. `counts × rates = the whole bill` with no model join, and the
 * vector maps 1:1 onto apify's own charge events. Fns never write flat
 * keys (`countsMismatch` + the type layer keep rejecting them — a fn
 * stating `"apify-actor-start": 2` stays unrepresentable); error settles
 * stay `zeroUsage()` — nothing billed, nothing counted.
 */
export function flatCounts(model: UsageModel): Record<string, number> {
    switch (model.kind) {
        case "PER_CALL":
            return { [CALL_KEY]: 1 };
        case "COMPOSITE":
            return Object.fromEntries(
                Object.entries(model.components)
                    .filter(([, component]) => component.kind === "PER_CALL")
                    .map(([id]) => [id, 1]),
            );
        case "PER_UNIT":
            return {};
        default:
            model satisfies never;
            return {};
    }
}

/**
 * Counts ↔ model discipline (design D19) — ONE exhaustive switch, placed
 * beside the schema it interprets so every consumer shares it: the engine
 * (wrapping violations in FN_CONTRACT at settle AND estimate), the test
 * suites' card-invariant helpers, and later the services broker. These
 * rules govern what FNS return; the engine then completes the vector with
 * `flatCounts` (design D24), so the PUBLIC usage carries every billed
 * component. Rules, one per model kind:
 *   - PER_CALL  → fn counts must be {} (the flat 1 is engine-appended);
 *   - PER_UNIT  → the single implied key is the model's unit;
 *   - COMPOSITE → every key names a PER_UNIT component (flat components
 *     are engine-appended, never fn-written).
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
