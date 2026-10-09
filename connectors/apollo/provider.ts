import { defineProvider, presets } from "@shared/core";

/**
 * Apollo (apollo.io) — B2B sales intelligence, ported from monid-services
 * `adaptors/apollo`. Eight synchronous JSON endpoints on ONE wire surface,
 * `https://api.apollo.io/api/v1/<path>`, `x-api-key` auth. Filters ride the
 * QUERY STRING even on the POST searches (Apollo's contract): an array
 * filter is a repeated key whose name carries the `[]`
 * (`person_titles[]=a&person_titles[]=b`), which is exactly the engine's
 * repeated-key encoding — no `toRequest`; no endpoint declares a body, so
 * none is sent (design D6).
 *
 * BILLING (design D3). Apollo bills in CREDITS from its published rate card
 * (https://docs.apollo.io/docs/api-pricing, checked 2026-09-16): 1 credit
 * per page of search results, 1 credit per matched record on enrichment
 * and the complete-info lookups, and nothing when no qualifying data comes
 * back — the count rule of every endpoint's `evidence` (design D4). A
 * synchronous response carries NO meter (`credits_consumed` exists only on
 * the phone-reveal webhook payload, and phone reveal is not ported — design
 * D2), so there is no `usage.consolidate`: the derived fold IS the bill and
 * `provider.test.ts` pins every endpoint's draw as a literal (clay D7a).
 * Each endpoint owns its `evidence` because Apollo names the delivered
 * collection per family (`organizations`, `news_articles`, `person`, …) —
 * there is no uniform envelope a provider-level counter could read
 * (design D5).
 *
 * No `output.fromError`: Apollo's error bodies vary by endpoint (`{error}`,
 * `{error, error_code}`, `{message}`, and a plain-text 401) and each already
 * reads as a message; they relay verbatim (design D7).
 */
export default defineProvider({
    name: "apollo",
    meta: {
        displayName: "Apollo",
        summary:
            "B2B sales intelligence: search and enrich people and companies.",
        description: "Apollo.io — B2B sales intelligence for agents: search " +
            "230M+ people and 30M+ companies, enrich people and " +
            "organizations with verified emails, firmographics, employment " +
            "history, funding, and technographics, and surface hiring and " +
            "news signals.",
        homepageUrl: "https://www.apollo.io",
        docsUrl: "https://docs.apollo.io/reference",
        categories: ["people-enrichment", "company-enrichment"],
        notes: [
            "Rate limits are per team and per endpoint, enforced per minute, " +
            "hour, and day; a 429 carries retry-after in seconds.",
            "Every endpoint needs a master API key or a key whose scope " +
            "includes that endpoint; an unscoped key answers 403 " +
            "API_INACCESSIBLE.",
        ],
    },
    auth: { inject: presets.auth.header("x-api-key") },
    request: { baseUrl: "https://api.apollo.io/api/v1" },
    // mirrors services/workflows/endpointExecution/config.yml (apollo):
    // request 60s, run 60s; no pollMs — every endpoint is sync.
    timeouts: { requestMs: 60_000, runMs: 60_000 },
    usage: {
        /** THE credit system (design D3): Apollo meters ONE pool of
         *  credits per workspace, drawn by every credit-consuming endpoint,
         *  so the pool is that unit and the id is `default`. The $/credit
         *  of the plan (v1: $0.025 on Basic) is the broker card's job, not
         *  the doc's. */
        credits: {
            default: {
                label: "Apollo credits",
                description: "the workspace's Apollo credit balance; " +
                    "1 credit per search page or matched record",
            },
        },
    },
});
