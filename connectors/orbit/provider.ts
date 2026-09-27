import { defineProvider, presets } from "@shared/core";

/**
 * Orbit (orbitsearch.com) — the deepest available context about a PERSON.
 * JSON over HTTP against `https://api.orbitsearch.com`, bearer auth with an
 * `sk_orb_` key, one public version: v3.
 *
 * Two shapes live behind that one host:
 *
 *   - A SYNC read — the profile read. One request, one answer.
 *   - ASYNC WORK — search and enrich. The submit answers `202` with a
 *     snapshot carrying the id and `status: "running"`; the lifecycle polls
 *     the matching status route until the status is terminal, so ONE monid
 *     run returns finished work. Orbit's status routes are not catalog
 *     endpoints: the engine drives every poll inside the run.
 *
 * EVERY SUBMIT CARRIES `Idempotency-Key: {runId}:submit` — the host-stable
 * run id (design D34), so a retried or replayed start converges on the
 * search or enrichment the first attempt created instead of paying for a
 * second one. Orbit documents the header and answers `409` when a key is
 * reused with a different body; the run id changes only when the run does.
 *
 * THE LIFECYCLE IS NOT ON THE PROVIDER. A provider-level `start` replaces
 * declarative execution on the SYNC endpoint too. Each async endpoint
 * authors its own phases.
 *
 * SCOPES: `search:read` and `profile:read`, the same pair Orbit's own hosted
 * MCP server publishes. The connector reaches no surface that needs
 * `watchers:write` or `webhooks:write`, so the provider key never has to
 * carry them.
 *
 * ONE STATUS-READ RULE, the same retry class in all three lifecycles —
 * Orbit's error guide puts `429` and every temporary server failure in a
 * single retry class, so a status read answering `408`, `429` or ANY `5xx`
 * is a lookup that failed rather than work that ended. Each one holds the
 * run open. That matters more here than politeness: the search or build is
 * still running on Orbit's side and still drawing credits, so settling on a
 * failed lookup abandons work the account is charged for. `Retry-After`
 * arrives in SECONDS on Orbit's `429`s and the v3 contract asks callers to
 * honor it, so it sets the next tick's cadence — clamped to [1s, 120s] so a
 * malformed header cannot stall a run, and bounded by `runMs` regardless.
 * Without the header a single run backs off fifteen seconds and the batch
 * thirty, its poll cadence being the slower of the two.
 * The lifecycles also FOLLOW THE LINK Orbit hands back (`links.status`),
 * which is what the v3 guide tells every caller to poll, and fall back to
 * the documented path shape.
 *
 * BILLING — THE RECEIPT SETTLES EVERY RUN. Every v3 response carries Orbit's
 * own receipt for the operation:
 *
 *   "billing": { "id", "pricingVersion", "reservedCredits",
 *                "consumedCredits", "releasedCredits", "heldCredits",
 *                "status": "open" | "settled" }
 *
 * `status` goes `open` -> `settled`, and `consumedCredits` on the terminal
 * snapshot is what Orbit charged (verified live 2026-09-20, 46 credits of
 * receipts). So every billed endpoint here is metered in Orbit's OWN credits
 * and the receipt is the evidence — provider-level `usage.evidence` reads it,
 * provider-level `usage.consolidate` claims it and plucks it out of the
 * payload (a receipt, not data).
 *
 * The receipt is the EVIDENCE, not only the claim, for a reason the engine
 * makes binding: a zero claim is pruned and falls back to the derived fold.
 * Orbit's zero receipts are real answers — an enrich of a profile already at
 * depth settles 0 — so a fold derived from anything else would overrule them.
 *
 * Nothing about the charge is inferable from the snapshot's visible state,
 * which is why nothing here tries:
 *   - a row seen `enriching` is not always a charged build (12 index hits
 *     with one row enriching settled 2, not 2 + 5);
 *   - a build can finish between two ticks and never be seen mid-build;
 *   - an enrich of a profile already at depth can answer `202 running` with
 *     `reservedCredits: 0` and settle 0 a few seconds later, so a 202 says
 *     nothing about whether work was charged.
 *
 * RATES appear in one place only: `usage.estimate`, the pre-run ceiling, read
 * from the published card (`GET /v2/developer/pricing`, unauthenticated,
 * version `2026-09-17`): index_search 1 per 10 results, candidate_discovery 1
 * per profile, partial_profile 5, full_profile 10, profile_read 1. A rate
 * change on Orbit's side moves the settle with it; only the ceiling is pinned.
 *
 * SURFACES NOT IN THIS CONNECTOR, and why:
 *   - Watchers: `watcher_run` and `watcher_update` accrue on Orbit's schedule
 *     AFTER the create call returns, so no run can settle them.
 *   - Population search: the receipt it reserves is settled "as the work
 *     completes", long after a pass-through submit returns.
 *   - Bulk search: held for an internal review on the vendor's side.
 *   - Webhooks: the create response carries a plaintext signing secret.
 *   - `face_search`, `profile_query` and the company lines price routes the
 *     public v3 document does not carry.
 */
export default defineProvider({
    name: "orbit",
    meta: {
        displayName: "Orbit",
        summary:
            "The deepest source-backed context about a person, for one-shot agent personalization and person enrichment.",
        description: "Orbit gives an agent a complete starting point on " +
            "anyone it needs to understand. From a name, an email, a phone " +
            "number, an address, a social handle or a plain-English " +
            "description, Orbit maps the person's public internet presence " +
            "into one source-backed profile: identity and contact details, " +
            "work history, and sections on their background, interests and " +
            "recent activity, with every claim linked to its source. The " +
            "agent can personalize from its first message, and refresh the " +
            "profile whenever it needs the latest. Reach for Orbit whenever " +
            "a person comes up: a friend you are choosing a birthday gift " +
            "for, a lead to enrich before your next sale, a candidate or " +
            "counterparty to vet, or someone you are about to meet.",
        homepageUrl: "https://orbitsearch.com",
        docsUrl: "https://docs.orbitsearch.com",
        categories: ["people-enrichment"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.orbitsearch.com" },
    /** Reads answer in well under a second and the async submits answer fast;
     *  the WORK is what takes time, and the endpoints that carry a lifecycle
     *  set their own whole-run budget. `pollMs` is the cadence Orbit's
     *  status routes are written for. */
    timeouts: { requestMs: 60_000, runMs: 120_000, pollMs: 5_000 },
    usage: {
        /** THE credit system (design D26): Orbit meters in its OWN credits,
         *  and that is the unit this doc bills in. No dollar rate is pinned
         *  here: the published packages do not price every tier alike, so a
         *  single $/credit constant would be fiction — the conversion stays
         *  the broker card's job, read from the live rate card. */
        credits: {
            default: {
                label: "Orbit credits",
                description:
                    "Orbit credits, bought in packages from $10 for 1,000; " +
                    "`GET /v2/developer/pricing` serves the live rate card",
            },
        },
        /** THE RECEIPT IS THE EVIDENCE. Every billed doc here is a leaf
         *  `PER_UNIT` in `CREDIT` units, so the count is the receipt's
         *  `consumedCredits` and the fold is the vendor's own number — which
         *  is what lets a ZERO receipt settle zero (a pruned zero claim
         *  would otherwise fall back to whatever else the fold derived). An
         *  absent receipt counts nothing. The batch overrides this to sum
         *  its children. */
        evidence: ({ data, utils }) => {
            if (data.usage.model.kind !== "PER_UNIT") return { counts: {} };
            const consumed = utils.json.optionalNum(
                data.output,
                "$.billing.consumedCredits",
            );
            return {
                counts: consumed === undefined
                    ? {}
                    : { [data.usage.model.unit]: consumed },
            };
        },
        /** THE VENDOR'S OWN CLAIM (design D27): the same receipt, lifted out
         *  of the payload in one motion. Omitted when absent. */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(data.output, "$.billing");
            const consumed = value === undefined
                ? undefined
                : utils.json.optionalNum(value, "$.consumedCredits");
            return {
                credits: {
                    ...(consumed !== undefined ? { default: consumed } : {}),
                },
                output: rest,
            };
        },
    },
    output: {
        /** Orbit's error envelope is `{status: "failed", error: {code,
         *  message}}`, with `requiredCredits`/`remainingCredits` alongside on
         *  a 402. Vendor non-2xx is DATA — the engine zero-bills it — and the
         *  machine `code` is the part an agent branches on
         *  (`developer_api_credits_insufficient`, `invalid_api_key`,
         *  `profile_not_found`). */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(
                data.output,
                "$.error.message",
            );
            const code = utils.json.optionalGet(data.output, "$.error.code");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "Orbit API error",
                ...(typeof code === "string" ? { code } : {}),
                raw: data.output,
            };
        },
    },
});
