import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zBatchEnrichBody } from "./schema/inputs.ts";

/**
 * `POST /v3/enrich` — build up to 20 people's profiles with one operation.
 *
 * ASYNC, AND THE ONE ENDPOINT THAT FANS OUT. Orbit's batch has no parent
 * status route: the submit hands back one child `request_id` per normalized
 * profile, and each child reads back through
 * `GET /v3/enrich/requests/{request_id}`. The lifecycle does what Orbit asks
 * a caller to do — reads the children that are still open, one at a time, and
 * once none are, reads every child once more so the output carries a
 * complete, current set of child snapshots under the parent envelope.
 *
 * Child ids have the shape `{parent}:{profile_id}`, so every path built from
 * one is URL-encoded. A child that completes on the submit carries no
 * `links.status` and a null receipt; its request route still answers.
 *
 * THE RECEIPTS SETTLE IT. Each child carries its own `billing` receipt, and
 * the batch settles their SUM — this endpoint overrides the provider's
 * evidence and consolidate only to add them up. A child already at depth
 * settles the zero Orbit charged for it, whichever status code its submit
 * answered with. A child is open until its status is terminal AND its
 * receipt is settled.
 *
 * Bounded by construction: 20 profiles is the vendor's own cap, child reads
 * are free, and Orbit's status bucket (25/s, burst 150) covers twenty reads
 * a tick.
 */
export default defineEndpoint({
    meta: {
        displayName: "Enrich Person Profiles (Batch)",
        summary: "Build up to 20 people's profiles in one call.",
        description: "Build up to 20 Orbit profiles with one operation and " +
            "get every finished profile back together. Same depths as the " +
            "single build: `partial` for a useful profile, `full` for the " +
            "deepest Orbit can build, and `regenerate` to force fresh " +
            "work — which can replace facts already on EVERY profile in " +
            "the list, so reach for it only when a refresh is what was " +
            "asked for. Takes Orbit profile ids or public slugs, " +
            "which `orbit#v3/search` returns; duplicates are normalized " +
            "before work starts. Reach for this when an agent holds a list " +
            "of people — a guest list, a roster, an account team, a " +
            "shortlist of candidates — and wants depth on all of them at " +
            "once. The result carries one " +
            "child per profile, each with its own status, depth and " +
            "profile. Profiles already at the depth you asked for come back " +
            "as they stand and cost nothing; the rest are 5 credits each " +
            "for `partial` and 10 each for `full` and `regenerate`. Use " +
            "`orbit#v3/search` first for anyone Orbit has yet to identify — " +
            "it returns the profile ids this endpoint takes.",
        docsUrl: "https://docs.orbitsearch.com/api/enrich/batch-enrich",
        categories: ["people-enrichment"],
    },
    request: { method: "POST", path: "/v3/enrich" },
    input: {
        schema: {
            body: zBatchEnrichBody.extend({
                include_profile: zBatchEnrichBody.shape.include_profile.unwrap()
                    .default(true),
            }),
        },
    },
    /** Measured live: a batch child at full depth took 27 minutes. 45
     *  minutes is the whole-run budget; a run that times out is still
     *  charged by Orbit. */
    timeouts: { requestMs: 60_000, runMs: 2_700_000, pollMs: 10_000 },
    lifecycle: {
        state: z.strictObject({
            children: z.array(z.string()).describe(
                "Every child `request_id`, in the order Orbit returned them.",
            ),
            pending: z.array(z.string()).describe(
                "The children still running.",
            ),
            parentRequestId: z.string().describe("The batch's own id."),
        }),
        start: async ({ data, utils, logger }) => {
            const res = await utils.request({
                headers: {
                    ...data.request.headers,
                    "Idempotency-Key": data.run.runId + ":submit",
                },
            });
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const parent = utils.json.optionalGet(res.body, "$.request_id");
            if (typeof parent !== "string" || parent === "") {
                throw new Error("Orbit did not return a batch request_id");
            }
            const rows = utils.json.optionalGet(res.body, "$.results");
            if (!Array.isArray(rows)) {
                throw new Error("Orbit batch enrich returned no results list");
            }
            const children = [];
            const pending = [];
            for (const row of rows) {
                const id = utils.json.optionalGet(row, "$.request_id");
                if (typeof id !== "string" || id === "") continue;
                children.push(id);
                if (
                    utils.json.optionalGet(row, "$.status") === "running" ||
                    utils.json.optionalGet(row, "$.billing.status") === "open"
                ) pending.push(id);
            }
            const state = {
                externalRunId: parent,
                data: { children, pending, parentRequestId: parent },
            };
            if (pending.length === 0) {
                logger.info("orbit batch enrich settled on submit", {
                    children: children.length,
                });
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                    state,
                };
            }
            return { kind: "RUNNING", state };
        },
        poll: async ({ data, utils, logger }) => {
            const previous = data.lifecycle.state.data;
            if (previous === undefined) {
                throw Object.assign(
                    new Error("orbit batch enrich poll without state"),
                    { retriable: false },
                );
            }
            // One child at a time, in state order: concurrent reads egress in
            // whatever order their auth step finishes, and a recorded fixture
            // replays in ONE order. At most 20 children, and the reads are free.
            const readAll = async (ids: string[]) => {
                const reads = [];
                for (const id of ids) {
                    const res = await utils.http({
                        method: "GET",
                        path: "/v3/enrich/requests/" + encodeURIComponent(id),
                    });
                    reads.push({ id, res });
                }
                return reads;
            };
            const pending = [];
            let backoffMs = 0;
            const reads = await readAll(previous.pending);
            for (const { id, res } of reads) {
                if (
                    res.status === 408 || res.status === 429 ||
                    res.status >= 500
                ) {
                    // The child's status LOOKUP failed while the build keeps
                    // running and keeps drawing credits — hold the child open.
                    // Same retry class the two single-run lifecycles use, and
                    // the same `Retry-After` rule; the slowest child sets the
                    // next cadence.
                    const after = Number(res.headers["retry-after"]);
                    const wait = Number.isFinite(after) && after > 0
                        ? Math.min(Math.max(after * 1000, 1_000), 120_000)
                        : 30_000;
                    if (wait > backoffMs) backoffMs = wait;
                    pending.push(id);
                    continue;
                }
                const ok = res.status >= 200 && res.status < 300;
                const status = ok
                    ? utils.json.optionalGet(res.body, "$.status")
                    : "failed";
                if (
                    status === "running" || status === undefined ||
                    (ok &&
                        utils.json.optionalGet(res.body, "$.billing.status") ===
                            "open")
                ) {
                    pending.push(id);
                }
            }
            if (pending.length > 0) {
                if (backoffMs > 0) {
                    logger.warn("orbit batch child lookup transient", {
                        pending: pending.length,
                        pollAfterMs: backoffMs,
                    });
                }
                // Four minutes in, these are full builds, and those run for
                // tens of minutes: thirty seconds a tick.
                const slowMs = data.lifecycle.state.timing.attempts > 24
                    ? 30_000
                    : 0;
                const waitMs = backoffMs > slowMs ? backoffMs : slowMs;
                return {
                    kind: "RUNNING",
                    state: { data: { ...previous, pending } },
                    ...(waitMs > 0 ? { pollAfterMs: waitMs } : {}),
                };
            }
            // The children that finished on the submit are re-read too, so
            // the envelope carries one CURRENT snapshot per profile. Child
            // reads are free.
            const results = [];
            const reopened = [];
            let errored = false;
            let finalBackoffMs = 0;
            const finalReads = await readAll(previous.children);
            for (const { id, res } of finalReads) {
                if (
                    res.status === 408 || res.status === 429 ||
                    res.status >= 500
                ) {
                    // The FINAL read is the same lookup the poll above makes,
                    // so it gets the same answer: a transient failure says
                    // nothing about the child. Re-open it rather than
                    // publishing a `failed` row — that row would carry no
                    // receipt, settling a build Orbit charged for at zero.
                    const after = Number(res.headers["retry-after"]);
                    const wait = Number.isFinite(after) && after > 0
                        ? Math.min(Math.max(after * 1000, 1_000), 120_000)
                        : 30_000;
                    if (wait > finalBackoffMs) finalBackoffMs = wait;
                    reopened.push(id);
                    continue;
                }
                if (res.status < 200 || res.status >= 300) {
                    errored = true;
                    results.push({
                        request_id: id,
                        status: "failed",
                        error: res.body,
                    });
                    continue;
                }
                if (
                    utils.json.optionalGet(res.body, "$.status") !== "completed"
                ) {
                    errored = true;
                }
                results.push(res.body);
            }
            if (reopened.length > 0) {
                logger.warn("orbit batch final read transient", {
                    reopened: reopened.length,
                    pollAfterMs: finalBackoffMs,
                });
                return {
                    kind: "RUNNING",
                    state: { data: { ...previous, pending: reopened } },
                    pollAfterMs: finalBackoffMs,
                };
            }
            logger.info("orbit batch enrich settled", {
                children: results.length,
            });
            return {
                kind: "COMPLETED",
                httpStatus: 200,
                output: {
                    request_id: previous.parentRequestId,
                    status: errored ? "completed_with_errors" : "completed",
                    results,
                },
                state: { data: { ...previous, pending: [] } },
            };
        },
    },
    usage: {
        /** Metered in Orbit's own credits: each child carries its receipt
         *  and the batch settles their sum. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "profile builds",
            description:
                "what the children drew, summed from Orbit's own receipts",
        },
        /** The ceiling: every profile in the list at the depth asked for,
         *  from the published card. Duplicate ids normalize away on Orbit's
         *  side, which only ever lowers the settle. */
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    CREDIT: body.profile_ids.length *
                        (body.operation === "partial" ? 5 : 10),
                },
            };
        },
        /** The SUM of the children's receipts. A child that completed on
         *  the submit carries a null receipt and adds nothing. */
        evidence: ({ data, utils }) => {
            const rows = utils.json.optionalGet(data.output, "$.results");
            let consumed = 0;
            let seen = false;
            if (Array.isArray(rows)) {
                for (const row of rows) {
                    const credits = utils.json.optionalNum(
                        row,
                        "$.billing.consumedCredits",
                    );
                    if (credits === undefined) continue;
                    consumed += credits;
                    seen = true;
                }
            }
            return { counts: seen ? { CREDIT: consumed } : {} };
        },
        /** The same sum as the claim. The per-child receipts stay in the
         *  output as each child's own provenance. */
        consolidate: ({ data, utils }) => {
            const rows = utils.json.optionalGet(data.output, "$.results");
            let consumed = 0;
            let seen = false;
            if (Array.isArray(rows)) {
                for (const row of rows) {
                    const credits = utils.json.optionalNum(
                        row,
                        "$.billing.consumedCredits",
                    );
                    if (credits === undefined) continue;
                    consumed += credits;
                    seen = true;
                }
            }
            return {
                credits: { ...(seen ? { default: consumed } : {}) },
                output: data.output,
            };
        },
    },
});
