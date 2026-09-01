import { z } from "zod";
import { type Json, zJson } from "@shared/core";

/**
 * HTTP fixture: recorded {req, res} pairs served in order during replay.
 * Headers are NEVER recorded — credentials cannot leak into fixtures.
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
    calls: z.array(zRecordedCall).min(1),
}).strict();
export type Fixture = z.infer<typeof zFixture>;

export async function loadFixture(path: string): Promise<Fixture> {
    return zFixture.parse(JSON.parse(await Deno.readTextFile(path)));
}

/** Serve recorded calls in order; fail loudly on mismatch or exhaustion. */
export function replayFetch(fixture: Fixture): typeof fetch {
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
        if (call.req.method !== method || call.req.url !== url) {
            return Promise.reject(
                new Error(
                    `replay(${fixture.name}): call ${index} expected ${call.req.method} ${call.req.url}, ` +
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
