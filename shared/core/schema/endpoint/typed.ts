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
import type {
    LifecycleRequestInfo,
    LifecycleUtils,
} from "../hooks/lifecycle.ts";
import type { RunInput } from "../run/input.ts";
import type { FnState, RunState } from "../run/state.ts";
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
 *  (mode-selected components — linkedin), a foreign key is not. `free`
 *  is settle-side only on billed models (dynamic vendor-$0, design D25)
 *  — the CONSOLIDATE position widens with it; the estimate position uses
 *  this shape verbatim, so a free promise on a billed model is a type
 *  error (matching the runtime freeMismatch rule). */
export type TypedUsage<K extends string> = {
    /** No metered keys (flat models) ⇒ only `{}` is writable —
     *  `Record<string, never>` rejects every entry (a bare `{}` target
     *  would accept anything: TS skips excess-property checks against
     *  empty shapes). */
    counts: [K] extends [never] ? Record<string, never>
        : Partial<Record<K, number>>;
    cost?: MonetaryValue;
    evidence?: Record<string, Json>;
};

/** The FREE-model fn return (design D25): free-ness is triple-stated —
 *  the model declares it, and BOTH fns return exactly this. */
export type TypedFreeUsage = {
    counts: Record<string, never>;
    free: true;
    evidence?: Record<string, Json>;
};

/** RunInput with the body AND queryParams typed by the doc's OWN schemas
 *  (design D25 — queryParams joins the typed layer; sound: validateInput
 *  clones + materializes defaults for all input channels first). */
export type TypedRunInput<B, Q = Record<string, Json> | undefined> =
    & Omit<RunInput, "body" | "queryParams">
    & { body: B; queryParams: Q };

/**
 * RunState / FnState with the fn-owned `data` bag typed by the doc's OWN
 * `lifecycle.state` schema (design D23 addendum) — SOUND like the body:
 * the engine validates `state.data` against `doc.lifecycle.stateSchema`
 * on every boundary before a fn sees it. No declared schema ⇒ `Json`
 * (exactly today's shape — no regression).
 */
export type TypedRunState<SD> = Omit<RunState, "data"> & { data?: SD };
export type TypedFnState<SD> = Omit<FnState, "data"> & { data?: SD };

/** The consolidate/fromResponse envelope ctx, body- and state-typed. Ctx
 *  paths name their PROVENANCE: `data.lifecycle.state` (the async run's
 *  final threaded state), `data.usage.model` (the doc's own model). */
export interface TypedEnvelopeCtx<
    B,
    SD = Json,
    Q = Record<string, Json> | undefined,
> {
    data: {
        input: TypedRunInput<B, Q>;
        output: Json;
        lifecycle?: { state: TypedRunState<SD> };
        usage: { model: UsageModel };
    };
    utils: FnUtils;
    logger: HookLogger;
}

/** The estimate ctx, body-typed (input-only — the estimate is the
 *  settle's promise, made before the vendor is touched). */
export interface TypedEstimateCtx<B, Q = Record<string, Json> | undefined> {
    data: {
        input: TypedRunInput<B, Q>;
        usage: { model: UsageModel };
    };
    utils: FnUtils;
    logger: HookLogger;
}

/**
 * Lifecycle fn ctxs + outcomes, body- and state-typed (design D23
 * addendum). The tick ctx reads the WHOLE RunState at
 * `data.lifecycle.state` (fn-owned fields + engine-owned timing); the
 * outcome's `state` is the fn-owned WHOLE next state (design D21) with
 * its `data` bag checked against the doc's declared `lifecycle.state`
 * schema AT THE WRITE SITE — a poll fn stashing a mis-shaped billing
 * signal fails `deno task check`, not just the runtime gate.
 */
export interface TypedLifecycleStartCtx<
    B,
    Q = Record<string, Json> | undefined,
> {
    data: {
        input: TypedRunInput<B, Q>;
        request: LifecycleRequestInfo;
    };
    utils: LifecycleUtils;
    logger: HookLogger;
}

export interface TypedLifecycleTickCtx<
    B,
    SD = Json,
    Q = Record<string, Json> | undefined,
> {
    data: {
        input: TypedRunInput<B, Q>;
        request: LifecycleRequestInfo;
        lifecycle: { state: TypedRunState<SD> };
    };
    utils: LifecycleUtils;
    logger: HookLogger;
}

export type TypedLifecycleOutcome<SD = Json> =
    | {
        kind: "RUNNING";
        state?: TypedFnState<SD>;
        pollAfterMs?: number;
    }
    | {
        kind: "COMPLETED";
        httpStatus: number;
        providerHttpStatus?: number;
        output: Json;
        state?: TypedFnState<SD>;
    };

/**
 * The SHARED seed slot-override shapes (design D24) — written once,
 * composed by BOTH `defineEndpoint` (B = the doc's own body type) and
 * `defineProvider` (B = `Json | undefined`: a provider fn serves every
 * endpoint, so its body is genuinely untypeable — D23's documented seam).
 * A builder API or z.function factories would be slimmer to write but
 * trade away seed-literal inference — the thing that keeps doc authoring
 * annotation-free.
 */
export type TypedLifecycleSlots<B, StateSchema extends z.ZodType, Seed> =
    & Omit<Seed, "state" | "start" | "poll" | "stop">
    & {
        state?: StateSchema;
        start?: (
            ctx: TypedLifecycleStartCtx<B>,
        ) => Promise<TypedLifecycleOutcome<z.output<StateSchema>>>;
        poll?: (
            ctx: TypedLifecycleTickCtx<B, z.output<StateSchema>>,
        ) => Promise<TypedLifecycleOutcome<z.output<StateSchema>>>;
        stop?: (
            ctx: TypedLifecycleTickCtx<B, z.output<StateSchema>>,
        ) => Promise<void>;
    };

export type TypedOutputSlots<B, SD, Seed> =
    & Omit<Seed, "fromResponse" | "fromError">
    & {
        fromResponse?: (ctx: TypedEnvelopeCtx<B, SD>) => Json;
        fromError?: (ctx: TypedEnvelopeCtx<B, SD>) => Json;
    };

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
        lifecycle?: { state: unknown };
        usage: { model: UsageModel };
    };
    utils: FnUtils;
    logger: HookLogger;
}) => {
    usage: {
        /** The one surviving consolidate preset (perCall) settles NO
         *  counts — Record<string, never> keeps it assignable to every
         *  typed slot (flat, metered, free-widened) without loosening
         *  any of them. */
        counts: Record<string, never>;
        cost?: MonetaryValue;
        evidence?: Record<string, Json>;
    };
    output?: Json;
};
