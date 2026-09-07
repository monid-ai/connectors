import { z } from "zod";
import { type Json, zJson } from "@shared/core";

/**
 * HTTP fixture: recorded {req, res} pairs served in order during replay.
 * Headers are NEVER recorded — credentials cannot leak into fixtures.
 *
 * FIXTURES ARE MINIMAL SHARED CHAINS (fixture strategy v2): committed DATA
 * files at PROVIDER level (`connectors/<provider>/fixtures/<shape>.json`) —
 * one hand-minimized chain per lifecycle SHAPE (run-succeeded, run-failed,
 * start-rejected, pay-per-event…), each stating what it exercises in
 * `description`. Call urls may carry `{{request.url}}` / `{{request.origin}}`
 * placeholders, bound at replay time from the endpoint's compiled request —
 * so ONE chain serves every endpoint of the provider.
 *
 * Recording heritage (fixture diet, design D11): chains derive from real
 * recordings — requests, order, statuses untouched (replay matches
 * REQUESTS only) — with RESPONSE bodies shrunk by the deterministic
 * `trimJson` pass (arrays capped, long strings truncated) and PII redacted
 * by `scrubJson` (structural placeholders; keys/shape intact). The
 * fixture-size lint (fixture-size.test.ts) bounds files.
 */
export const zRecordedCall = z.object({
    req: z.object({
        method: z.string(),
        url: z.string(),
        body: zJson.optional(),
    }).strict(),
    res: z.object({
        status: z.number().int(),
        body: zJson,
    }).strict(),
}).strict();
export type RecordedCall = z.infer<typeof zRecordedCall>;

export const zFixture = z.object({
    name: z.string().min(1),
    /** What lifecycle shape this chain exercises — every fixture says why
     *  it exists (fixture strategy v2). */
    description: z.string().min(1),
    calls: z.array(zRecordedCall).min(1),
}).strict();
export type Fixture = z.infer<typeof zFixture>;

export async function loadFixture(path: string): Promise<Fixture> {
    return zFixture.parse(JSON.parse(await Deno.readTextFile(path)));
}

/** Trim bounds — tunable beside the pass, mirrored by the size lint. */
export const TRIM_ARRAY_CAP = 2;
export const TRIM_STRING_CAP = 500;

/**
 * The deterministic trim pass: cap every array to its first
 * TRIM_ARRAY_CAP elements and truncate string leaves beyond
 * TRIM_STRING_CAP chars — recursively, keys and structure untouched.
 * Applied ONLY to recorded RESPONSE bodies (never requests/urls/statuses),
 * so the replayed wire contract is unchanged; only what the engine
 * CONSUMES shrinks (count assertions reflect the trimmed reality).
 */
export function trimJson(value: Json): Json {
    if (typeof value === "string") {
        return value.length > TRIM_STRING_CAP
            ? value.slice(0, TRIM_STRING_CAP)
            : value;
    }
    if (Array.isArray(value)) {
        return value.slice(0, TRIM_ARRAY_CAP).map(trimJson);
    }
    if (value !== null && typeof value === "object") {
        const out: Record<string, Json> = {};
        for (const [key, item] of Object.entries(value)) {
            out[key] = trimJson(item);
        }
        return out;
    }
    return value;
}

/** Apply the trim pass to a recorded call chain (response bodies only). */
export function trimCalls(calls: RecordedCall[]): RecordedCall[] {
    return calls.map((call) => ({
        req: call.req,
        res: { status: call.res.status, body: trimJson(call.res.body) },
    }));
}

/**
 * The PII scrub pass (fixture strategy v2): value-level redaction on string
 * LEAVES — email-shaped substrings → `user@example.com`, E.164-ish phone
 * substrings → `+15550000000` — recursively, keys and structure untouched.
 * Deliberately conservative (regex leaves, no key heuristics): recordings
 * are for SHAPE, and shape survives redaction. Applied by the recorder
 * after `trimJson`; shared committed chains are additionally hand-checked.
 */
export function scrubJson(value: Json): Json {
    if (typeof value === "string") {
        return value
            .replace(
                /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
                "user@example.com",
            )
            .replace(/\+\d{7,15}/g, "+15550000000");
    }
    if (Array.isArray(value)) return value.map(scrubJson);
    if (value !== null && typeof value === "object") {
        const out: Record<string, Json> = {};
        for (const [key, item] of Object.entries(value)) {
            out[key] = scrubJson(item);
        }
        return out;
    }
    return value;
}

/** trim + scrub over a recorded chain (response bodies only). */
export function scrubCalls(calls: RecordedCall[]): RecordedCall[] {
    return calls.map((call) => ({
        req: call.req,
        res: { status: call.res.status, body: scrubJson(call.res.body) },
    }));
}

/**
 * Serve recorded calls in order; fail loudly on mismatch or exhaustion.
 * `bindings` substitute `{{key}}` placeholders in recorded urls before
 * compare (e.g. `{{request.url}}` → the endpoint's compiled request url) —
 * how one shared chain serves every endpoint of a provider.
 */
export function replayFetch(
    fixture: Fixture,
    bindings: Record<string, string> = {},
): typeof fetch {
    const bind = (template: string): string =>
        template.replace(
            /\{\{([A-Za-z_][\w.-]*)\}\}/g,
            (whole, key: string) => bindings[key] ?? whole,
        );
    let index = 0;
    return (
        input: URL | RequestInfo,
        init?: RequestInit,
    ): Promise<Response> => {
        const url = typeof input === "string"
            ? input
            : input instanceof URL
            ? input.href
            : input.url;
        const method = init?.method ?? "GET";
        const call = fixture.calls[index];
        if (!call) {
            return Promise.reject(
                new Error(
                    `replay(${fixture.name}): no recorded call left for ${method} ${url}`,
                ),
            );
        }
        const expectedUrl = bind(call.req.url);
        if (call.req.method !== method || expectedUrl !== url) {
            return Promise.reject(
                new Error(
                    `replay(${fixture.name}): call ${index} expected ${call.req.method} ${expectedUrl}, ` +
                        `engine issued ${method} ${url}`,
                ),
            );
        }
        index++;
        return Promise.resolve(
            new Response(JSON.stringify(call.res.body), {
                status: call.res.status,
                headers: { "content-type": "application/json" },
            }),
        );
    };
}

/** Wrap a real fetch, capturing {req, res} pairs (headers dropped by design). */
export function recordingFetch(
    realFetch: typeof fetch,
    sink: RecordedCall[],
): typeof fetch {
    return async (
        input: URL | RequestInfo,
        init?: RequestInit,
    ): Promise<Response> => {
        const url = typeof input === "string"
            ? input
            : input instanceof URL
            ? input.href
            : input.url;
        const method = init?.method ?? "GET";
        const requestBody = typeof init?.body === "string"
            ? parseMaybeJson(init.body)
            : undefined;
        const response = await realFetch(input, init);
        const text = await response.text();
        sink.push({
            req: {
                method,
                url,
                ...(requestBody !== undefined ? { body: requestBody } : {}),
            },
            res: {
                status: response.status,
                body: parseMaybeJson(text) ?? text,
            },
        });
        return new Response(text, {
            status: response.status,
            headers: {
                "content-type": response.headers.get("content-type") ??
                    "application/json",
            },
        });
    };
}

function parseMaybeJson(text: string): Json | undefined {
    try {
        return JSON.parse(text) as Json;
    } catch {
        return undefined;
    }
}
