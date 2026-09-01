import { z } from "zod";
import { type Json, zJson } from "../json/type.ts";
import { type JsonUtil } from "../json/util.ts";
import { type MoneyUtil } from "../usage/monetary.ts";

/**
 * WHAT A HOOK IS (see the design.md/README primer): a doc is a recipe card of
 * pure data; the five fn-bearing doc fields are the HOOKS — the only places
 * code may appear (`input.toRequest`, `usage.compute`, `usage.consolidate`,
 * `output.fromResponse`, `auth.inject`). Each hook has ONE definition: its
 * CONTRACT — the zod `z.function({input, output})` factory in its own file
 * here, beside its ctx data shape. Every hook fn takes ONE
 * `ctx = { data, utils }`:
 *   - `ctx.data`  — pure JSON, hook-specific, validated by the contract on
 *     every call (FN_CONTRACT). The validated/unvalidatable boundary is
 *     structural, not a naming convention.
 *   - `ctx.utils` — host capabilities (engine code, not data): `utils.json`
 *     (JsonUtil) and `utils.money` (MoneyUtil), both implemented in
 *     engine/fn-utils.ts.
 */
export interface FnUtils {
    json: JsonUtil;
    money: MoneyUtil;
}

export const zFnUtils = z.custom<FnUtils>(
    (value) =>
        typeof value === "object" && value !== null && "json" in value &&
        "money" in value,
    "expected FnUtils ({ json: JsonUtil, money: MoneyUtil })",
);

/**
 * `output` rides as z.custom, not zJson: it is JSON **by construction**
 * (produced by the engine's own decode) and re-walking multi-MB vendor
 * payloads on every call would be pure overhead. Fn RETURN values get the
 * full strict validation instead (each hook's contract).
 */
export const zOutputByConstruction = z.custom<Json>((value) =>
    value !== undefined
);

export const zEvidence = z.record(z.string(), zJson);

// ---------------------------------------------------------------------------
// Carriers — the contract's stand-in inside object schemas.
// zod v4's `z.function()` is NOT a ZodType: it cannot `.parse` a value and
// cannot sit inside `z.strictObject({...})`. So each def field holds a
// carrier — a `z.custom` "is a function" check TYPED by the contract's fn
// type. Mechanical plumbing, one concept: the contract stays the single
// source of truth for the hook's signature.
//   input.schema.body: z.object({ q: z.string() })  ← zSchemaCarrier checks
//     "is a zod schema"; the compiler converts it to JSON Schema.
//   toRequest: ({ data }) => ({ ...data.input })     ← fnCarrier checks "is a
//     function"; the compiler extracts + hashes its source.
// ---------------------------------------------------------------------------

/** Holds a LIVE zod schema inside a def (compiled to JSON Schema). */
export const zSchemaCarrier = z.custom<z.ZodType>(
    (value) => value instanceof z.ZodType,
    "expected a zod schema",
);
export type SchemaCarrier = z.infer<typeof zSchemaCarrier>;

/** Holds a hook function inside a def; the hook's contract types it.
 *  (Return annotated with BOTH type params — `z.ZodType<F>` alone would
 *  default Input to `unknown` and break seed typing / contract params.) */
export function fnCarrier<F>(label: string): z.ZodType<F, F> {
    return z.custom<F>(
        (value) => typeof value === "function",
        `expected ${label}`,
    );
}
