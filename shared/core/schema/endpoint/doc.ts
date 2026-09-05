import { z } from "zod";
import { contractConfig } from "../../config.ts";
import {
    zDocHash,
    zEndpointId,
    zProviderName,
    zSemverString,
} from "../common/ids.ts";
import { zHttpMethod } from "../common/http.ts";
import { zEndpointMeta } from "../meta/endpoint.ts";
import { zJsonSchemaDoc } from "./json-schema-doc.ts";
import { zFnRef } from "../fn-table/ref.ts";
import { zTimeouts } from "../sections/timeouts.ts";

/**
 * zEndpointDoc — the COMPILED artifact: pure, flat, strict RFC 8259 JSON,
 * self-executing after provider fusion (no provider lookup at run time; all
 * leaf-wise fallback already resolved). Hooks hold `$fn` content-id
 * references — a doc alone cannot execute; it runs as a SEALED UNIT
 * ({doc, fns}, bundle/sealed-unit.ts).
 */
export const zEndpointDoc = z.strictObject({
    /** Doc FORMAT version (config.yml schema.spec_version) — semver. */
    specVersion: z.literal(contractConfig.schema.specVersion),
    id: zEndpointId, // "exa#search" — inferred, never authored
    provider: zProviderName,
    /** Compiler-derived: semverMax(doc_format_since, api of every $fn). */
    minEngineVersion: zSemverString,
    /** Post-fallback (docsUrl/categories may come from the provider). */
    meta: zEndpointMeta,
    auth: z.strictObject({
        /** Executed by the injector (Transport/Relay), never the pipeline. */
        inject: zFnRef,
        /** JSON Schema of the credential SHAPE — validated against RESOLVED
         *  secrets before inject runs (MISSING_CREDENTIAL). Never a value. */
        credentials: zJsonSchemaDoc,
    }),
    request: z.strictObject({
        method: zHttpMethod,
        /** Absolute after baseUrl resolution; may contain {pathParam}s. */
        url: z.string().min(1),
        headers: z.record(z.string(), z.string()).optional(),
    }),
    input: z.strictObject({
        schema: z.strictObject({
            body: zJsonSchemaDoc.optional(),
            queryParams: zJsonSchemaDoc.optional(),
            pathParams: zJsonSchemaDoc.optional(),
        }),
        toRequest: zFnRef.optional(),
    }),
    output: z.strictObject({
        fromResponse: zFnRef.optional(),
        /** Provider-error projection (runs after zero-usage forcing). */
        fromError: zFnRef.optional(),
        /** Validates the FINAL (post-fromResponse) SUCCESS output. */
        schema: zJsonSchemaDoc.optional(),
    }),
    usage: z.strictObject({
        /** THE settle fn: RAW envelope → {usage, output?} — REQUIRED,
         *  resolved endpoint ?? provider at compile. */
        consolidate: zFnRef,
    }),
    /**
     * Async run protocol (engine ≥ config schema.async_since). When present
     * the engine calls `start` INSTEAD of executing `request` itself —
     * `request` stays required and rides into the fns as ctx.data.request.
     * `poll` absent ⇒ not pollable; `stop` absent ⇒ stop is a no-op.
     */
    lifecycle: z.strictObject({
        start: zFnRef,
        poll: zFnRef.optional(),
        stop: zFnRef.optional(),
    }).optional(),
    timeouts: zTimeouts,
    /** Hash of the stable serialization (minus this field) — covers $fn ids. */
    hash: zDocHash,
});
export type EndpointDoc = z.infer<typeof zEndpointDoc>;

/** Collect every $fn id a doc references. */
export function fnKeysOf(doc: EndpointDoc): string[] {
    const keys: string[] = [doc.auth.inject.$fn.key];
    if (doc.input.toRequest) keys.push(doc.input.toRequest.$fn.key);
    if (doc.output.fromResponse) keys.push(doc.output.fromResponse.$fn.key);
    if (doc.output.fromError) keys.push(doc.output.fromError.$fn.key);
    keys.push(doc.usage.consolidate.$fn.key);
    if (doc.lifecycle) {
        keys.push(doc.lifecycle.start.$fn.key);
        if (doc.lifecycle.poll) keys.push(doc.lifecycle.poll.$fn.key);
        if (doc.lifecycle.stop) keys.push(doc.lifecycle.stop.$fn.key);
    }
    return [...new Set(keys)];
}
