import {
    type EndpointDoc,
    type FnEntry,
    formatZodError,
    type JsonSchemaDoc,
    type RunInput,
    zRunInput,
} from "@shared/core";
import { EngineError, EngineErrorCode } from "./errors.ts";
import type { PreparedRequest } from "./interfaces/mod.ts";
import { validateAgainst } from "./validate.ts";

/**
 * Validate the caller's input: first the RunInput shape itself (the engine
 * boundary trusts no host — CLI, tests, hosted workers all pass through here),
 * then the doc's input schemas.
 */
export function validateInput(doc: EndpointDoc, rawInput: unknown): RunInput {
    const shape = zRunInput.safeParse(rawInput);
    if (!shape.success) {
        throw new EngineError(
            EngineErrorCode.INVALID_INPUT,
            `${doc.id}: input ${formatZodError(shape.error)}`,
        );
    }
    const runInput = shape.data;
    const schemas = doc.input.schema;
    const checks: [string, JsonSchemaDoc | undefined, unknown][] = [
        ["body", schemas.body, runInput.body],
        ["queryParams", schemas.queryParams, runInput.queryParams ?? {}],
        ["pathParams", schemas.pathParams, runInput.pathParams ?? {}],
    ];
    for (const [label, schema, value] of checks) {
        if (!schema) continue;
        const result = validateAgainst(schema, value ?? null);
        if (!result.ok) {
            throw new EngineError(
                EngineErrorCode.INVALID_INPUT,
                `${doc.id}: input.${label} ${result.message}`,
            );
        }
    }
    return runInput;
}

/** Build the PreparedRequest: {pathParam} substitution, query mapping, JSON body. */
export function buildRequest(
    doc: EndpointDoc,
    input: RunInput,
    injectEntry: FnEntry,
): PreparedRequest {
    let url = doc.request.url;
    for (const placeholder of url.match(/\{[A-Za-z_][A-Za-z0-9_]*\}/g) ?? []) {
        const name = placeholder.slice(1, -1);
        const value = input.pathParams?.[name];
        if (value === undefined) {
            throw new EngineError(
                EngineErrorCode.INVALID_INPUT,
                `${doc.id}: missing pathParams.${name} for url placeholder`,
            );
        }
        url = url.replaceAll(placeholder, encodeURIComponent(value));
    }

    const query: Record<string, string> = {};
    for (const [key, value] of Object.entries(input.queryParams ?? {})) {
        if (value === null || value === undefined) continue;
        if (Array.isArray(value) || typeof value === "object") {
            throw new EngineError(
                EngineErrorCode.INVALID_INPUT,
                `${doc.id}: queryParams.${key} must be a scalar (array/object encodings arrive at a later engine version)`,
            );
        }
        query[key] = String(value);
    }

    return {
        method: doc.request.method,
        url,
        headers: { ...doc.request.headers },
        query,
        body: input.body,
        auth: {
            inject: { ref: doc.auth.inject, entry: injectEntry },
            credentials: doc.auth.credentials,
        },
        provider: doc.provider,
        timeouts: { requestMs: doc.timeouts.requestMs },
    };
}
