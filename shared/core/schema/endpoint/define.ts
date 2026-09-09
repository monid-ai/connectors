import { z } from "zod";
import { parseSchema } from "../parse.ts";
import { type EndpointDef, type EndpointDefSeed, zEndpointDef } from "./def.ts";
import type { Json } from "../json/type.ts";
import type { UsageModel } from "../usage/model/mod.ts";
import type {
    MeteredKeyOf,
    TypedEnvelopeCtx,
    TypedEstimateCtx,
    TypedLifecycleOutcome,
    TypedLifecycleStartCtx,
    TypedLifecycleTickCtx,
    TypedUsage,
} from "./typed.ts";

type SeedInput = NonNullable<EndpointDefSeed["input"]>;
type SeedUsage = NonNullable<EndpointDefSeed["usage"]>;
type SeedOutput = NonNullable<EndpointDefSeed["output"]>;
type SeedLifecycle = NonNullable<EndpointDefSeed["lifecycle"]>;

/**
 * The def IS the parsed seed: defaults applied recursively, strictness
 * enforced. The signature is GENERIC (designs D19a + D23 — the type
 * layer; runtime is untouched, zod stays the truth):
 *   - `M` (const, inferred from `usage.model`): `usage.counts` keys in
 *     the doc's own consolidate/estimate narrow to the model's literal
 *     metered keys; a flat doc's estimate slot is `never` (a counting
 *     fn there is a doc-site type error).
 *   - `BodySchema` (inferred from `input.schema.body`): the fns'
 *     `data.input.body` is `z.output` of the doc's OWN schema — direct,
 *     typed property access (sound: validateInput runs the same schema,
 *     defaults materialized, before any hook).
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
>(
    seed:
        & Omit<EndpointDefSeed, "usage" | "input" | "output" | "lifecycle">
        & {
            input?: Omit<SeedInput, "schema"> & {
                schema?: Omit<NonNullable<SeedInput["schema"]>, "body"> & {
                    body?: BodySchema;
                };
            };
            output?: Omit<SeedOutput, "fromResponse" | "fromError"> & {
                fromResponse?: (
                    ctx: TypedEnvelopeCtx<
                        z.output<BodySchema>,
                        z.output<StateSchema>
                    >,
                ) => Json;
                fromError?: (
                    ctx: TypedEnvelopeCtx<
                        z.output<BodySchema>,
                        z.output<StateSchema>
                    >,
                ) => Json;
            };
            usage?:
                & Omit<SeedUsage, "model" | "consolidate" | "estimate">
                & {
                    model?: M;
                    consolidate?: (
                        ctx: TypedEnvelopeCtx<
                            z.output<BodySchema>,
                            z.output<StateSchema>
                        >,
                    ) => {
                        usage: TypedUsage<MeteredKeyOf<M>>;
                        output?: Json;
                    };
                    estimate?: [MeteredKeyOf<M>] extends [never] ? never
                        : (
                            ctx: TypedEstimateCtx<z.output<BodySchema>>,
                        ) => TypedUsage<MeteredKeyOf<M>>;
                };
            lifecycle?:
                & Omit<SeedLifecycle, "state" | "start" | "poll" | "stop">
                & {
                    state?: StateSchema;
                    start?: (
                        ctx: TypedLifecycleStartCtx<z.output<BodySchema>>,
                    ) => Promise<TypedLifecycleOutcome<z.output<StateSchema>>>;
                    poll?: (
                        ctx: TypedLifecycleTickCtx<
                            z.output<BodySchema>,
                            z.output<StateSchema>
                        >,
                    ) => Promise<TypedLifecycleOutcome<z.output<StateSchema>>>;
                    stop?: (
                        ctx: TypedLifecycleTickCtx<
                            z.output<BodySchema>,
                            z.output<StateSchema>
                        >,
                    ) => Promise<void>;
                };
        },
): EndpointDef {
    return parseSchema(zEndpointDef, seed as EndpointDefSeed, "defineEndpoint");
}
