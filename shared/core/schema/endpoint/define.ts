import { z } from "zod";
import { parseSchema } from "../parse.ts";
import { type EndpointDef, type EndpointDefSeed, zEndpointDef } from "./def.ts";
import type { Json } from "../json/type.ts";
import type { UsageModel } from "../usage/model/mod.ts";
import type {
    MeteredKeyOf,
    TypedEnvelopeCtx,
    TypedEstimateCtx,
    TypedUsage,
} from "./typed.ts";

type SeedInput = NonNullable<EndpointDefSeed["input"]>;
type SeedUsage = NonNullable<EndpointDefSeed["usage"]>;

/**
 * The def IS the parsed seed: defaults applied recursively, strictness
 * enforced. The signature is GENERIC (design D19a — the type layer;
 * runtime is untouched, zod stays the truth):
 *   - `M` (const, inferred from `usage.model`): `usage.counts` keys in
 *     the doc's own consolidate/estimate narrow to the model's literal
 *     metered keys; a flat doc's estimate slot is `never` (a counting
 *     preset there is a doc-site type error).
 *   - `BodySchema` (inferred from `input.schema.body`): the fns'
 *     `data.input.body` is `z.output` of the doc's OWN schema — direct,
 *     typed property access (sound: validateInput runs the same schema,
 *     defaults materialized, before any hook).
 * If inference ever degrades through the intersections, both widen to
 * today's untyped behavior — never worse; @ts-expect-error tests in
 * core.test.ts prove the narrowing actually holds.
 */
export function defineEndpoint<
    const M extends UsageModel | undefined = undefined,
    BodySchema extends z.ZodType = z.ZodType<Json | undefined>,
>(
    seed:
        & Omit<EndpointDefSeed, "usage" | "input">
        & {
            input?: Omit<SeedInput, "schema"> & {
                schema?: Omit<NonNullable<SeedInput["schema"]>, "body"> & {
                    body?: BodySchema;
                };
            };
            usage?:
                & Omit<SeedUsage, "model" | "consolidate" | "estimate">
                & {
                    model?: M;
                    consolidate?: (
                        ctx: TypedEnvelopeCtx<z.output<BodySchema>>,
                    ) => {
                        usage: TypedUsage<MeteredKeyOf<M>>;
                        output?: Json;
                    };
                    estimate?: [MeteredKeyOf<M>] extends [never] ? never
                        : (
                            ctx: TypedEstimateCtx<z.output<BodySchema>>,
                        ) => TypedUsage<MeteredKeyOf<M>>;
                };
        },
): EndpointDef {
    return parseSchema(zEndpointDef, seed as EndpointDefSeed, "defineEndpoint");
}
