import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zEmailVerifierQueryParams } from "./schema/inputs.ts";

/** GET /email-verifier — deliverability verification for one address. */
export default defineEndpoint({
    meta: {
        displayName: "Verify Email",
        summary:
            "Verify whether an email address is deliverable, with a full SMTP-level breakdown.",
        description: "Check the deliverability of one email address. " +
            "Returns a status (valid / invalid / accept_all / webmail / " +
            "disposable / unknown), a 0-100 deliverability score, and the " +
            "full check breakdown: regexp, gibberish detection, " +
            "disposable/webmail flags, MX records, SMTP server " +
            "reachability, mailbox existence, accept-all and block flags, " +
            "plus public source URLs when the address was seen on the " +
            "web. Slow mail servers keep the run in progress for a while. " +
            "Suited for pre-send list cleaning, validating found " +
            "addresses, and bounce-rate protection.",
        docsUrl: "https://hunter.io/api-documentation/v2#email-verifier",
        categories: ["people-enrichment"],
        notes: [
            "Charged only on a definitive verdict (valid, invalid, " +
            "accept_all) — unknown results and disposable/webmail " +
            "addresses are free.",
            "When Hunter cannot reach the remote mail server (its 222 " +
            "answer) the run settles as a 502 provider error carrying " +
            "Hunter's body, zero usage — retry later.",
        ],
    },
    request: { method: "GET", path: "/email-verifier" },
    // v1 email-verifier: run 180s (several 20s SMTP rounds), poll 10s
    timeouts: { requestMs: 30_000, runMs: 180_000, pollMs: 10_000 },
    input: { schema: { queryParams: zEmailVerifierQueryParams } },
    /**
     * WHY THIS ENDPOINT OWNS ITS LIFECYCLE (owner decision 2026-09-17,
     * design D2): Hunter verifies for up to ~20s synchronously, then
     * answers with two NON-STANDARD 2xx codes the declarative path would
     * settle as billable success — 202 (still verifying; re-GET the same
     * URL, counted once upstream) and 222 (the remote SMTP server
     * misbehaved; terminal, OURS 502 / THEIRS 222, zero-billed). Hunter
     * issues no job id: the poll is the same GET, and the per-tick
     * `utils.request()` carries the caller's email, so no state is kept
     * (v1 stashed the query in metadata for the same reason).
     */
    lifecycle: {
        start: async ({ utils }) => {
            const res = await utils.request();
            if (res.status === 202) return { kind: "RUNNING" };
            if (res.status === 222) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: 222,
                    output: res.body,
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
        poll: async ({ utils }) => {
            const res = await utils.request();
            // a 5xx mid-verification is upstream infrastructure, not an
            // answer — keep polling; `runMs` bounds the wait (v1 posture)
            if (res.status === 202 || res.status >= 500) {
                return { kind: "RUNNING" };
            }
            if (res.status === 222) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: 222,
                    output: res.body,
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
    },
    usage: {
        /** 0.5 credit per verification with a definitive verdict — the
         *  pricing page ("Verify email: 0.5 credit") and v1's drill;
         *  unknown / disposable / webmail are free upstream (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "verdicts",
            description: "definitive verdicts (valid, invalid, accept_all)",
            consumes: { credit: "default", amount: 0.5 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** A verdict = `data.status` in the billed set (v1 BILLED_STATUSES). */
        evidence: ({ data, utils }) => {
            const status = utils.json.optionalGet(data.output, "$.data.status");
            const billed = status === "valid" || status === "invalid" ||
                status === "accept_all";
            return { counts: { RESULT: billed ? 1 : 0 } };
        },
    },
});
