import { z } from "zod";
import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";
import { zNumberId } from "../../../schema/common.ts";

/**
 * /get-numbers — one owned number PLUS its LIVE persona, in ONE call (v1
 * `numbers/get-number.ts`). The stored row comes from the ownership
 * window; the connection detail is fetched FRESH via the stored pointer —
 * persona content is never persisted, so what you read is upstream truth
 * at this moment. READS + key: the engine's pre-gate answers the uniform
 * 404 for foreign/unknown ids before anything executes.
 */
export const zGetNumberBody = z.object({
    numberId: zNumberId.describe("The id of a phone number YOU OWN."),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Get Phone Number",
        summary:
            "Get one of your numbers WITH its live AI persona in one call.",
        description: "Fetch one of YOUR numbers plus its LIVE connection (AI " +
            "persona) in a single call: the number's identity plus the " +
            "persona's instructions, language, voice, model, call " +
            "controls, and compliance settings — read fresh from the " +
            "carrier, never a stale copy. Pass the number's id as " +
            "'numberId' (find it via /list-numbers).",
        docsUrl: "https://saperly.com/docs/guides/connections",
        categories: ["agentic-phone"],
    },
    endpoint: "/get-numbers",
    request: { method: "GET", path: "/numbers/{id}" },
    input: {
        schema: { body: zGetNumberBody },
        toRequest: ({ data }) => ({
            ...data.input,
            pathParams: {
                id: String(
                    (data.input.body as Record<string, unknown>).numberId,
                ),
            },
        }),
    },
    resources: {
        reads: [{
            id: "saperly/phone-number",
            key: "$.body.numberId",
        }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: {
        start: async ({ data, utils, logger }) => {
            const $ = utils.json;
            const numberId = String(
                (data.input.body as Record<string, unknown>).numberId,
            );
            const rows = await utils.resources.owned({
                resource: "saperly/phone-number",
                externalId: numberId,
            });
            const row = rows[0];
            if (row === undefined) {
                // pre-gate race with a concurrent release — same uniform 404
                return {
                    kind: "COMPLETED",
                    httpStatus: 404,
                    output: {
                        code: "number_not_found",
                        message: "Number " + numberId + " not found",
                    } as Json,
                };
            }
            const item = {
                numberId: row.externalId,
                ...($.optionalStr(row.data, "$.phoneNumber") !== undefined
                    ? { phoneNumber: $.get(row.data, "$.phoneNumber") }
                    : {}),
                country: $.optionalStr(row.data, "$.country") ?? "US",
                numberType: $.optionalStr(row.data, "$.numberType") ??
                    "local",
            };
            const connection = $.optionalStr(
                row.data,
                "$.externalRefs.connection",
            );
            if (connection === undefined) {
                // degraded number (bind failed at provision) — still fully
                // manageable; repair via /update-numbers
                return {
                    kind: "COMPLETED",
                    httpStatus: 200,
                    output: { ...item, connection: null } as Json,
                };
            }
            const res = await utils.http({
                method: "GET",
                path: "/connections/" + connection,
            });
            if (res.status < 200 || res.status >= 300) {
                logger.warn("live connection fetch failed on /get-numbers", {
                    numberId,
                    status: res.status,
                });
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: res.status,
                    output: {
                        code: "connection_fetch_failed",
                        message: "The number's persona could not be read " +
                            "from the carrier right now — try again",
                    } as Json,
                };
            }
            // the RAW connection rides — the provider projection
            // re-shapes it into the public allowlist (never its id)
            return {
                kind: "COMPLETED",
                httpStatus: 200,
                output: { ...item, connection: res.body } as Json,
            };
        },
    },
});
