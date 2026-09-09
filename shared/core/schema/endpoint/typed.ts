/**
 * The TYPE layer over `defineEndpoint` (design D19a) — types only, no
 * runtime: zod stays the runtime truth (the derived-enum pattern), TS
 * narrows on top of the SAME declarations, so a doc's own fns are checked
 * against the doc's own model and input schema at `deno task check`:
 *
 *   - `usage.counts` KEYS are the model's literal metered keys — a typo'd
 *     or flat-component key fails the typecheck;
 *   - `data.input.body` is `z.output` of the doc's OWN input schema —
 *     direct property access, no JSONPath guessing (sound at runtime:
 *     `validateInput` runs the same schema before any hook, with schema
 *     defaults materialized into the body);
 *   - a COUNTING estimate cannot be declared on a flat doc at all (the
 *     slot type is `never` — "this preset doesn't support this model" is
 *     a doc-site type error, not a silent {} fallback).
 */
import type { z } from "zod";
import type { Json } from "../json/type.ts";
import type { FnUtils, HookLogger } from "../hooks/ctx.ts";
import type { RunInput } from "../run/input.ts";
import type { UsageModel } from "../usage/model/mod.ts";
import type { MonetaryValue } from "../usage/monetary.ts";

/**
 * The metered counts KEYS a model bills, as LITERAL types: COMPOSITE →
 * its PER_UNIT component ids (flat components filtered out — never a
 * count); leaf PER_UNIT → the unit; PER_CALL / no model → `never`
 * (nothing countable). The type-level twin of the runtime rules in
 * usage/validate.ts (`countsMismatch`).
 */
export type MeteredKeyOf<M> = M extends {
    kind: "COMPOSITE";
    components: infer C;
} ?
        & {
            [K in keyof C]: C[K] extends { kind: "PER_UNIT" } ? K : never;
        }[keyof C]
        & string
    : M extends { kind: "PER_UNIT"; unit: infer U extends string } ? U
    : never;

/** Usage with model-keyed counts: a SUBSET of the billed keys is legal
 *  (mode-selected components — linkedin), a foreign key is not. */
export type TypedUsage<K extends string> = {
    counts: Partial<Record<K, number>>;
    cost?: MonetaryValue;
    evidence?: Record<string, Json>;
};

/** RunInput with the body typed by the doc's OWN schema. */
export type TypedRunInput<B> = Omit<RunInput, "body"> & { body: B };

/** The consolidate/fromResponse envelope ctx, body-typed. */
export interface TypedEnvelopeCtx<B> {
    data: {
        input: TypedRunInput<B>;
        output: Json;
        state?: Json;
        model: UsageModel;
    };
    utils: FnUtils;
    logger: HookLogger;
}

/** The estimate ctx, body-typed (input-only — the estimate is the
 *  settle's promise, made before the vendor is touched). */
export interface TypedEstimateCtx<B> {
    data: {
        input: TypedRunInput<B>;
        model: UsageModel;
    };
    utils: FnUtils;
    logger: HookLogger;
}

/**
 * The PORTABLE fn shape the remaining consolidate preset returns:
 * body-agnostic (`body?: unknown` — a preset guards its own reads), so
 * one preset term slots into ANY doc's typed consolidate position via
 * plain assignability. (The estimate twin died with the estimate presets
 * — design D23: a typed inline fn IS the typed estimate.)
 */
export type PortableConsolidateFn = (ctx: {
    data: {
        input: Omit<RunInput, "body"> & { body?: unknown };
        output: Json;
        state?: Json;
        model: UsageModel;
    };
    utils: FnUtils;
    logger: HookLogger;
}) => {
    usage: {
        counts: Record<string, number>;
        cost?: MonetaryValue;
        evidence?: Record<string, Json>;
    };
    output?: Json;
};
