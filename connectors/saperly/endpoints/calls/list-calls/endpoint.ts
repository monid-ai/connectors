import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zNumberId } from "../../../schema/common.ts";

/**
 * /list-calls — the call history of a number you own (v1
 * `calls/list-calls.ts`). TENANCY: upstream `GET /calls` takes NO query
 * parameters and returns the ENTIRE pooled workspace — the local filter
 * on the ownership-GATED numberId below IS the tenancy boundary; the
 * unfiltered list is never relayed.
 */
export const zListCallsQuery = z.object({
    numberId: zNumberId.describe(
        "The id of a phone number YOU OWN — lists calls placed from or " +
            "received on it. REQUIRED.",
    ),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "List Calls",
        summary:
            "List the call history of a number you own — inbound and outbound.",
        description:
            "List the call history of one of YOUR numbers — inbound and " +
            "outbound calls with direction, status, duration, and " +
            "timestamps. Pass the number's id as 'numberId' (find it " +
            "via /list-numbers). Use a call's id with /get-calls, " +
            "/call-transcripts, or /call-recordings.",
        docsUrl: "https://saperly.com/docs/guides/voice",
        categories: ["agentic-phone"],
    },
    endpoint: "/list-calls",
    request: { method: "GET", path: "/calls" },
    input: { schema: { queryParams: zListCallsQuery } },
    resources: {
        uses: [{
            id: "saperly/phone-number",
            key: "$.queryParams.numberId",
        }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: {
        start: async ({ data, utils }) => {
            const $ = utils.json;
            const numberId = String(
                (data.input.queryParams as Record<string, unknown>)
                    .numberId,
            );
            const res = await utils.http({ method: "GET", path: "/calls" });
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            // TENANCY BOUNDARY: only items belonging to the gated OWNED
            // number may ever leave this function
            const items = (Array.isArray(res.body) ? res.body : [])
                .filter((item) =>
                    $.optionalStr(item, "$.numberId") === numberId
                );
            return {
                kind: "COMPLETED",
                httpStatus: 200,
                providerHttpStatus: res.status,
                output: items,
            };
        },
    },
});
