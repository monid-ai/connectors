import { z } from "zod";
import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";
import { zCallId, zNumberId } from "../../../schema/common.ts";

/**
 * /get-calls — one call's detail (v1 `calls/get-call.ts`). USES with NO
 * key (the ANCHOR pattern, design D32/D37): ownership is derived IN-FN —
 * the caller must own `numberId` (checked via `utils.resources`) AND the
 * fetched call must BELONG to it (the pair check on the one upstream
 * fetch). Foreign, unknown, and mismatched ids are indistinguishable — a
 * uniform 404 as data (pointer-is-liveness: released numbers 404 their
 * artifacts because the reader no longer serves the row).
 */
export const zGetCallBody = z.object({
    numberId: zNumberId.describe(
        "The id of a phone number YOU OWN (the call's own number).",
    ),
    callId: zCallId.describe(
        "The call to fetch — an id from /place-calls or /list-calls.",
    ),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Get Call",
        summary:
            "Get one call by id — direction, status, duration, timestamps.",
        description: "Fetch one call's detail from one of YOUR numbers — " +
            "direction, status, duration, and timestamps. Pass " +
            "'numberId' (the owned number the call belongs to) and " +
            "'callId'. Useful for history drill-down and polling an " +
            "in-flight call.",
        docsUrl: "https://saperly.com/docs/guides/voice",
        categories: ["agentic-phone"],
    },
    endpoint: "/get-calls",
    request: { method: "GET", path: "/calls/{id}" },
    input: {
        schema: { body: zGetCallBody },
        toRequest: ({ data }) => ({
            ...data.input,
            pathParams: {
                id: String(
                    (data.input.body as Record<string, unknown>).callId,
                ),
            },
        }),
    },
    resources: { uses: [{ id: "saperly/phone-number" }] },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: {
        start: async ({ data, utils }) => {
            const $ = utils.json;
            const body = data.input.body!;
            const owned = await utils.resources.owned({
                resource: "saperly/phone-number",
                externalId: body.numberId,
            });
            if (owned.length === 0) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 404,
                    output: {
                        code: "call_not_found",
                        message: "Call " + body.callId + " not found",
                    } as Json,
                };
            }
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            // PAIR CHECK: a foreign/guessed callId under your own
            // numberId never returns the payload
            if ($.optionalStr(res.body, "$.numberId") !== body.numberId) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 404,
                    providerHttpStatus: res.status,
                    output: {
                        code: "call_not_found",
                        message: "Call " + body.callId + " not found",
                    } as Json,
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
    },
});
