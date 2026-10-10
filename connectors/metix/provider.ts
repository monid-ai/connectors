import { defineProvider, presets } from "@shared/core";

/**
 * Metix AI (platform.metix.ai) — people, job and company data. Seven
 * synchronous endpoints against `https://mira-api.metix.ai`, auth
 * `Authorization: Bearer <key>`.
 *
 * SEARCH AND READ ARE TWO CALLS, BY DESIGN. Every search answers with
 * encrypted string IDs and no record data at all; a second call turns up
 * to 100 of those IDs into records. No endpoint does both. The vendor
 * names this the most common integration mistake against the API, because
 * code written as though one call does both reads an empty payload and
 * concludes the dataset is empty. Each search endpoint's description
 * therefore names the detail endpoint that completes it.
 *
 * ONE credit pool. The account meters a single balance, API Credits, so
 * the pool is `default` (design D26/D6). Metix publishes the rate card
 * machine-readably: every endpoint in `GET /contract` carries a `quota`
 * block with `dynamicCost.formula` (the settle), `preflightMaxCost.formula`
 * (the estimate), `resultPath` (what to count) and `priceVersion`. The
 * models below are a transcription of that block at
 * `usage-pricing-v2026-09-20`, not an interpretation of prose.
 *
 * NO `usage.consolidate` (design D27 — it is optional, and pdl, clay and
 * tinyfish ship without one). Metix reports no meter the fns can read:
 * the success envelope is `{code, msg, data}` with the IDs, a `total` and
 * a `next` cursor and no billing field, and the response headers carry
 * only `x-mira-request-id` and `x-trace-id` (plus `Retry-After` on a 429).
 * There is no claim to lift, so the derived fold settles every run. The
 * contact endpoints, which DO report `summary.charged_credits`, are a
 * later phase and will bring a consolidate with them.
 *
 * NO `output.fromError` either: refusals are real HTTP statuses (401 on a
 * missing or invalid key, 400 on a query the vocabulary refuses, 429 with
 * `Retry-After`), and the body's `code` only mirrors the status line. The
 * engine zero-bills every non-2xx envelope on its own.
 *
 * NO `output.fromResponse`: the `{code, msg, data}` envelope rides through
 * untouched, which is what Metix's own MCP server does. Lifting `$.data`
 * on success would cost a refusal its `error_code` and `docs_url` — the
 * two fields the vendor designs for an agent to recover from a 4xx by
 * fetching the named page as markdown — or make the output shape depend
 * on the status, which is worse than two redundant keys.
 *
 * `usage.evidence` below is the provider-wide default for the six leaf
 * PER_UNIT docs: count the one result array the response carries, which
 * is the vendor's own `quota.resultPath` — `found` on the detail
 * endpoints, `<entity>_ids` on the searches. `metix#v1/people-search` is
 * COMPOSITE and keys its counts by component id, so it overrides this.
 */
export default defineProvider({
    name: "metix",
    meta: {
        displayName: "Metix AI",
        summary: "People, job and company data for search and enrichment.",
        description: "People, job and company data built for agents: 900M " +
            "profiles, 90M job postings and 30M companies, searched through " +
            "one grammar. A structured boolean query, or a natural-language " +
            "description of the person you want, returns matching IDs; a " +
            "second call turns up to 100 IDs into full records with work " +
            "history, education, skills, firmographics and job detail. " +
            "Search and read are deliberately separate calls, so a filter " +
            "can be narrowed against `total` before paying to read any " +
            "records.",
        homepageUrl: "https://platform.metix.ai",
        docsUrl: "https://platform.metix.ai/docs/api",
        categories: ["people-enrichment", "company-enrichment", "jobs"],
        notes: [
            "Every search returns encrypted string IDs and no record data. " +
            "Reading records is a second call to the matching detail " +
            "endpoint, capped at 100 IDs per request.",
            "A leaf in the `where` tree carries exactly one operator, so a " +
            "bounded range is an `all` of two leaves. This is a cross-field " +
            "rule and cannot be expressed in the compiled schema.",
            "Category fields are matched exactly, including case: " +
            "`current_seniority` takes one of Intern, Specialist, Senior, " +
            "Manager, Head, Director, Vice President, President/Vice " +
            "President, C-Level, Partner, Founder, Owner, and a lower-case " +
            "spelling matches nothing rather than erroring.",
            "The live field vocabulary is GET /contract " +
            "(querySpecByEntity), which also states the operators each " +
            "field accepts. A field name outside that list is refused with " +
            "HTTP 400 error_code query_spec, before anything is charged.",
            "Read `total` before paging. It says whether a filter is narrow " +
            "enough to be worth walking, and looking at it costs nothing.",
            "Rate limits are 60 requests per minute per key and 120 per " +
            "client address, answered past either with HTTP 429 and a " +
            "Retry-After header in seconds.",
        ],
    },
    auth: {
        inject: presets.auth.bearer(),
        // credentials omitted → default { apiKey: non-empty string }, read
        // locally from METIX_CREDENTIALS_API_KEY (or the METIX_API_KEY
        // alias).
    },
    request: { baseUrl: "https://mira-api.metix.ai" },
    // Sync provider, no poll loop. Provisional at 60s, which is the budget
    // the vendor's own documented rate-limit posture implies; the measured
    // p95 of all seven endpoints is being drilled before submission, and
    // any endpoint that lands consistently above 60s moves to the async
    // lifecycle rather than keeping a sync doc with a longer budget.
    timeouts: { requestMs: 60_000, runMs: 60_000 },
    usage: {
        /** The one pool the account meters (design D26). */
        credits: { default: { label: "Metix API Credits" } },
        /** The generic QUANTITIES default (design D27): count the single
         *  result array in the envelope, which is the vendor's own
         *  `quota.resultPath`. A 200 carrying none of them, or an empty
         *  one, counts 0 — which is exactly the published rule, since a
         *  structured search that matches nothing and a detail read that
         *  finds nothing are both free. Flat and composite docs do not
         *  reach this fn: the compiler synthesizes the empty counts for
         *  meterless models, and people-search declares its own. */
        evidence: ({ data, utils }) => {
            if (data.usage.model.kind !== "PER_UNIT") return { counts: {} };
            // The detail endpoints report `found` as an INTEGER count, not
            // an array of records — reading it with optionalLen throws on
            // the type. The searches report an array of IDs. Each is the
            // vendor's own `quota.resultPath` for that family.
            const found = utils.json.optionalNum(data.output, "$.data.found");
            if (found !== undefined) {
                return { counts: { [data.usage.model.unit]: found } };
            }
            let counted = 0;
            for (
                const path of [
                    "$.data.profile_ids",
                    "$.data.job_ids",
                    "$.data.company_ids",
                ]
            ) {
                const length = utils.json.optionalLen(data.output, path);
                if (length !== undefined) {
                    counted = length;
                    break;
                }
            }
            return { counts: { [data.usage.model.unit]: counted } };
        },
    },
});
