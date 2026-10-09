import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zNumberId } from "../../../schema/common.ts";

/**
 * /release-numbers — stop renewing a phone number you own (v1
 * `numbers/release-number.ts`; the D37 RELEASES anchor).
 *
 * The run performs NO upstream call (the v1 single-owner rule, now a
 * derived mark): the RELEASES binding pre-gates ownership and a success
 * settle emits `resources.releases = [target]` — the HOST stops billing,
 * keeps the number usable until its paid-through date, then executes the
 * resource doc's `ops.release` exactly once (releaseLead 6 h before the
 * period end). No refunds — the current period is already paid and stays
 * yours.
 */
export const zReleaseNumberBody = z.object({
    numberId: zNumberId.describe("The id of a phone number YOU OWN."),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Release Phone Number",
        summary:
            "Stop renewing a phone number; it stays active until its paid-through date.",
        description:
            "Release a phone number you own. Renewals stop immediately; " +
            "the number remains usable until the end of the period you " +
            "already paid for, then it is released back to the carrier. " +
            "No refunds for the current period.",
        docsUrl: "https://saperly.com/docs/guides/numbers",
        categories: ["agentic-phone"],
        notes: [
            "Call artifacts die with the number: transcripts and " +
            "recordings become unavailable after release — fetch them " +
            "before releasing.",
        ],
    },
    endpoint: "/release-numbers",
    /** The real upstream route — documentation + the substituted anchor;
     *  the start below never calls it (the HOST's wind-down does, through
     *  the resource doc's ops.release). */
    request: { method: "POST", path: "/numbers/{id}/release" },
    input: {
        schema: { body: zReleaseNumberBody },
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
        releases: [{
            id: "saperly/phone-number",
            key: "$.body.numberId",
        }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: {
        /** LOCAL ack — the release itself is the settle mark's job. */
        // deno-lint-ignore require-await
        start: async ({ data }) => ({
            kind: "COMPLETED",
            httpStatus: 202,
            output: {
                numberId: (data.input.body as Record<string, unknown>)
                    .numberId as string,
                status: "release_requested",
                note: "Renewals stopped. The number stays active until " +
                    "its paid-through date, then is released.",
            },
        }),
    },
});
