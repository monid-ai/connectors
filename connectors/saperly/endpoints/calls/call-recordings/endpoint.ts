import { z } from "zod";
import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";
import { zCallId, zNumberId } from "../../../schema/common.ts";

/**
 * /call-recordings — the audio recording of a finished call (v1
 * `calls/call-recording.ts`). Same ANCHOR ownership as /call-transcripts;
 * the artifact read surfaces Saperly's 302 redirect as a short-lived
 * download URL via the response `location` header (HttpResult.headers —
 * the D34 headers channel; the body spelling is accepted too).
 */
export const zCallRecordingBody = z.object({
    numberId: zNumberId.describe(
        "The id of the phone number YOU OWN that placed/received the call.",
    ),
    callId: zCallId,
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Get Call Recording",
        summary:
            "Fetch a short-lived download URL for a finished call's audio.",
        description: "Fetch the audio recording of a finished call on one of " +
            "YOUR numbers, as a short-lived download URL. Pass " +
            "'numberId' + 'callId'.",
        docsUrl: "https://saperly.com/docs/guides/voice",
        categories: ["agentic-phone"],
        notes: [
            "The returned recordingUrl is short-lived — fetch it promptly.",
            "Recordings become unavailable once the number is released " +
            "— fetch them before releasing.",
        ],
    },
    endpoint: "/call-recordings",
    request: { method: "GET", path: "/calls/{id}/recording" },
    input: {
        schema: { body: zCallRecordingBody },
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
            if (res.status >= 300 && res.status < 400) {
                // the redirect target IS the artifact — headers channel
                // first, body spelling accepted as fallback
                const location = res.headers?.["location"] ??
                    $.optionalStr(res.body, "$.location");
                if (location !== undefined) {
                    return {
                        kind: "COMPLETED",
                        httpStatus: 200,
                        providerHttpStatus: res.status,
                        output: {
                            callId: body.callId,
                            recordingUrl: location,
                            note: "Short-lived download URL — fetch it " +
                                "promptly.",
                        } as Json,
                    };
                }
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: res.status,
                    output: {
                        code: "malformed_redirect",
                        message: "Saperly returned a redirect without a " +
                            "Location header",
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
