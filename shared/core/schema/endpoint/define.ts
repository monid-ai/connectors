import { z } from "zod";
import { parseSchema } from "../parse.ts";
import { type EndpointDef, type EndpointDefSeed, zEndpointDef } from "./def.ts";
import type { Json } from "../json/type.ts";
import type { UsageModel } from "../usage/model/mod.ts";
import type {
    MeteredKeyOf,
    TypedEnvelopeCtx,
    TypedEstimateCtx,
    TypedLifecycleSlots,
    TypedOutputSlots,
    TypedUsage,
} from "./typed.ts";

type SeedInput = NonNullable<EndpointDefSeed["input"]>;
type SeedUsage = NonNullable<EndpointDefSeed["usage"]>;
type SeedOutput = NonNullable<EndpointDefSeed["output"]>;
type SeedLifecycle = NonNullable<EndpointDefSeed["lifecycle"]>;

/**
 * The def IS the parsed seed: defaults applied recursively, strictness
 * enforced. The signature is GENERIC (designs D19a + D23 + D25 — the
 * type layer; runtime is untouched, zod stays the truth):
 *   - `M` (const, inferred from `usage.model`): `usage.counts` keys in
 *     the doc's own consolidate/estimate narrow to the model's literal
 *     metered keys. A FREE model's fns must return the free shape
 *     (`{counts: {}, free: true}`); a flat model's estimate can promise
 *     only `{}` (the engine appends the flat 1s); a billed model's
 *     ESTIMATE cannot promise `free` (settle-side dynamic free only —
 *     freeMismatch is the runtime twin).
 *   - `BodySchema` / `QuerySchema` (inferred from `input.schema`): the
 *     fns' `data.input.body` / `data.input.queryParams` are `z.output`
 *     of the doc's OWN schemas — direct, typed property access (sound:
 *     validateInput runs the same schemas, defaults materialized into
 *     clones, before any hook).
 *   - `StateSchema` (inferred from `lifecycle.state`): the fn-owned
 *     `state.data` bag is typed at `data.lifecycle.state.data` (read)
 *     AND in lifecycle outcomes (write) — sound: the engine validates it
 *     against the compiled stateSchema on every tick boundary. Raw
 *     vendor output stays `Json` deliberately (no schema describes it;
 *     `utils.json` is its idiom).
 * If inference ever degrades through the intersections, all widen to
 * today's untyped behavior — never worse; @ts-expect-error tests in
 * core.test.ts prove the narrowing actually holds.
 */
export function defineEndpoint<
    const M extends UsageModel | undefined = undefined,
    BodySchema extends z.ZodType = z.ZodType<Json | undefined>,
    StateSchema extends z.ZodType = z.ZodType<Json | undefined>,
    QuerySchema extends z.ZodType = z.ZodType<
        Record<string, Json> | undefined
    >,
>(
    seed:
        & Omit<EndpointDefSeed, "usage" | "input" | "output" | "lifecycle">
        & {
            input?: Omit<SeedInput, "schema"> & {
                schema?:
                    & Omit<
                        NonNullable<SeedInput["schema"]>,
                        "body" | "queryParams"
                    >
                    & {
                        body?: BodySchema;
                        queryParams?: QuerySchema;
                    };
            };
            output?: TypedOutputSlots<
                z.output<BodySchema>,
                z.output<StateSchema>,
                SeedOutput
            >;
            usage?:
                & Omit<SeedUsage, "model" | "consolidate" | "estimate">
                & {
                    model?: M;
                    consolidate?: (
                        ctx: TypedEnvelopeCtx<
                            z.output<BodySchema>,
                            z.output<StateSchema>,
                            z.output<QuerySchema>
                        >,
                    ) => {
                        usage: TypedUsage<MeteredKeyOf<M>>;
                        output?: Json;
                    };
                    estimate?: (
                        ctx: TypedEstimateCtx<
                            z.output<BodySchema>,
                            z.output<QuerySchema>
                        >,
                    ) => TypedUsage<MeteredKeyOf<M>>;
                };
            lifecycle?: TypedLifecycleSlots<
                z.output<BodySchema>,
                StateSchema,
                SeedLifecycle
            >;
        },
): EndpointDef {
    return parseSchema(zEndpointDef, seed as EndpointDefSeed, "defineEndpoint");
}
