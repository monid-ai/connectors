import { defineProvider, presets } from "@shared/core";

/**
 * JobsPipe (jobspipe.dev) — live job postings from 30+ job boards, public
 * employment services and company career sites, normalized into one
 * schema, plus the companies behind them. Four synchronous endpoints
 * against `https://api.jobspipe.dev`, bearer auth (`jp_live_…` keys issued
 * from the dashboard), billed in JobsPipe credits (one pool: a plan's
 * monthly allowance, top-ups and the Free grant are one balance).
 *
 * The rate card (docs.jobspipe.dev, 2026-10-07): the two job searches cost
 * ONE CREDIT PER POSTING RETURNED — a posting the account already paid for
 * this calendar month (UTC) is free on every later page that carries it —
 * the company lookup is ONE FLAT CREDIT PER CALL, and the stack scan is one
 * credit when it detected something and free when it did not (the API's
 * flat-route rule: a call that delivered nothing hands its credit back).
 * A search that matches nothing costs nothing; every non-2xx (401, 402
 * monthly quota, 404 no match, 429 per-second limit, 5xx) is error-as-data
 * at zero usage.
 *
 * Only the searches carry a meter: `metadata.credits_charged` is the
 * vendor's own statement of what the call cost AFTER the already-paid
 * discount, so the provider consolidate lifts it out as the claim (design
 * D27 — the claim wins). The fold is built to agree with it: the generic
 * evidence counts the postings in `data[]` MINUS `metadata.jobs_already_paid`
 * (the vendor's own count of the free rows on the page), so a page of
 * already-paid postings folds to 0 — which matters because a zero claim is
 * pruned at settle and the fold would otherwise bill rows the vendor gave
 * away. The flat docs have no meter, so their claim is empty and the
 * derived fold settles. The search's `include_technologies` surcharge is
 * a second component with its own evidence (see jobs-search), and the
 * scan owns a 0/1 counter on `detected`.
 */
export default defineProvider({
    name: "jobspipe",
    meta: {
        displayName: "JobsPipe",
        summary: "Live job postings from 30+ sources in one schema, with " +
            "company enrichment and tech-stack scans.",
        description: "JobsPipe — who is hiring, right now, from live job " +
            "postings collected across LinkedIn, Indeed, Y Combinator, " +
            "Workday, Greenhouse, Lever, Ashby and 30+ other boards, " +
            "public employment services and company career sites, " +
            "deduplicated and normalized into one schema: title, " +
            "company (with domain, headcount and revenue), location " +
            "down to metro, remote/hybrid/onsite, seniority, employment " +
            "type, posted salary annualized to USD, skills and ESCO " +
            "concepts, ISCO occupation and ISIC industry codes, visa " +
            "stance, benefits, applicant counts, ghost-job score and " +
            "lifecycle status. Search it with structured filters or a " +
            "plain-language request, look up the enriched record of one " +
            "company, or scan a domain for the technologies it serves. " +
            "Built for sales signals (who is hiring for what), labour " +
            "market research and recruiting agents.",
        homepageUrl: "https://jobspipe.dev",
        docsUrl: "https://docs.jobspipe.dev",
        categories: ["jobs", "company-enrichment"],
        notes: [
            "A non-2xx answers `{error, message?}`: 401 bad key, 402 the " +
            "monthly credit quota (the body adds credits_used / " +
            "credits_included and an upgrade_url), 429 the per-second " +
            "rate limit (Retry-After: 1, plus RateLimit-* headers), 404 " +
            "no company matched — all settle as provider errors with " +
            "zero usage.",
            "Search pages are capped by the plan: 25 postings on Free, " +
            "100 below 300,000 credits a month, 500 from 300,000. A " +
            "`limit` above the cap is clamped, not refused.",
            "Every POST accepts an optional Idempotency-Key header: a " +
            "repeat with the same key within 24 h returns the original " +
            "response (Idempotent-Replayed: true) without billing " +
            "again.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.jobspipe.dev" },
    // sync provider: a filter search answers in well under 10 s; the
    // agentic search overrides to its own 5–15 s envelope
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        /** ONE pool: JobsPipe credits (design D26). The published rate is
         *  $1.05–$1.96 per 1,000 by package size, so the conversion stays
         *  the broker card's job and the pool is the vendor's own credit. */
        credits: { default: { label: "JobsPipe credits" } },
        /** The vendor's OWN claim (design D27): the search responses
         *  carry `metadata.credits_charged`, the cost after the
         *  already-paid-this-month discount. Plucked out of the payload
         *  (consolidation, not hiding — `jobs_already_paid` and the
         *  balance fields stay as receipts); OMITTED when absent (the
         *  flat docs, a search answered to an unmetered caller) so the
         *  derived fold settles. */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.metadata.credits_charged",
            );
            return {
                credits: {
                    ...(typeof value === "number" ? { default: value } : {}),
                },
                output: rest,
            };
        },
        /** The generic QUANTITIES default (design D27): a PER_UNIT doc
         *  counts the BILLABLE postings in `data[]` — "one credit is one job
         *  returned", minus the rows the vendor reports as already paid for
         *  this month (`metadata.jobs_already_paid`), so the fold agrees
         *  with the claim and a fully-paid page folds to 0. The flat docs
         *  have nothing to count. A 200 with no matches carries an empty
         *  array — 0 rows, 0 credits. */
        evidence: ({ data, utils }) => {
            if (data.usage.model.kind !== "PER_UNIT") return { counts: {} };
            const rows = utils.json.optionalLen(data.output, "$.data") ?? 0;
            const paid = utils.json.optionalNum(
                data.output,
                "$.metadata.jobs_already_paid",
            ) ?? 0;
            return {
                counts: { [data.usage.model.unit]: Math.max(0, rows - paid) },
            };
        },
    },
    output: {
        /** JobsPipe's error envelope `{error, message?, …}` →
         *  `{message, detail?, raw}` (design D12). `error` is the
         *  human-readable line ("Monthly request quota exceeded", "Invalid
         *  search filters: …"); `message`, when present, is the longer
         *  detail. Not a stable code — match on the HTTP status. */
        fromError: ({ data, utils }) => {
            const error = utils.json.optionalStr(data.output, "$.error");
            const detail = utils.json.optionalStr(data.output, "$.message");
            return {
                message: error !== undefined && error !== ""
                    ? error
                    : "JobsPipe API error",
                ...(detail !== undefined && detail !== "" ? { detail } : {}),
                raw: data.output,
            };
        },
    },
});
