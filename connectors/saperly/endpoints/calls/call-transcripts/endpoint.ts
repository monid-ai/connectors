import { z } from "zod";
import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";
import { zCallId, zNumberId } from "../../../schema/common.ts";

/**
 * /call-transcripts — the transcript of a finished call (v1
 * `calls/call-transcript.ts`). The ANCHOR pattern (see /get-calls): the
 * pooled upstream answers 200 for ANY tenant's call id, so ownership is
 * derived in-fn — own the number, pair-verify the call on a read-only
 * anchor fetch, THEN fetch the artifact (the artifact responses carry no
 * numberId, so the anchor fetch is where the pair check must live).
 */
export const zCallTranscriptBody = z.object({
    numberId: zNumberId.describe(
        "The id of the phone number YOU OWN that placed/received the call.",
    ),
    callId: zCallId,
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Get Call Transcript",
        summary: "Fetch the turn-by-turn transcript of a finished call.",
        description: "Fetch the transcript of a finished call on one of YOUR " +
            "numbers — the turn-by-turn text of what the persona and " +
            "the other party said. Pass 'numberId' + 'callId'.",
        docsUrl: "https://saperly.com/docs/guides/voice",
        categories: ["agentic-phone"],
        notes: [
            "Transcripts become unavailable once the number is released " +
            "— fetch them before releasing.",
        ],
    },
    endpoint: "/call-transcripts",
    request: { method: "GET", path: "/calls/{id}/transcript" },
    input: {
        schema: { body: zCallTranscriptBody },
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
            // the ANCHOR fetch — the pair check lives here
            const anchor = await utils.http({
                method: "GET",
                path: "/calls/" + body.callId,
            });
            if (anchor.status >= 500) {
                throw new Error(
                    "saperly call lookup failed with HTTP " + anchor.status,
                );
            }
            if (
                anchor.status < 200 || anchor.status >= 300 ||
                $.optionalStr(anchor.body, "$.numberId") !== body.numberId
            ) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 404,
                    providerHttpStatus: anchor.status,
                    output: {
                        code: "call_not_found",
                        message: "Call " + body.callId + " not found",
                    } as Json,
                };
            }
            const res = await utils.request();
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
    },
});
