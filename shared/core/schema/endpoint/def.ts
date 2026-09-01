import { z } from "zod";
import { zEndpointMeta } from "../meta/endpoint.ts";
import {
    zAuthSection,
    zEndpointRequest,
    zInputSection,
    zOutputSection,
    zTimeoutsSection,
    zUsageSection,
} from "../sections/mod.ts";

/**
 * zEndpointDef — the AUTHOR-side schema, zod-first:
 *   EndpointDefSeed = z.input  (what authors write)
 *   EndpointDef     = z.output (what the compiler consumes)
 * `defineEndpoint(seed)` IS `parseSchema(zEndpointDef, seed)`. Identity
 * (id = "<provider>#<folder>") is inferred by the compiler, never authored.
 * minEngineVersion is compiler-derived only — no author field.
 *
 * Every section except meta+request is OPTIONAL: it falls back leaf-wise to
 * the provider's identical section (endpoint ?? provider ?? config default),
 * so a minimal endpoint is just meta + request + input.schema. The compiler
 * enforces that url, auth.inject, and usage.compute resolve SOMEWHERE.
 */
export const zEndpointDef = z.strictObject({
    meta: zEndpointMeta,
    request: zEndpointRequest,
    input: zInputSection.optional(),
    output: zOutputSection.optional(),
    usage: zUsageSection.optional(),
    auth: zAuthSection.optional(),
    timeouts: zTimeoutsSection.optional(),
});

export type EndpointDefSeed = z.input<typeof zEndpointDef>;
export type EndpointDef = z.output<typeof zEndpointDef>;
