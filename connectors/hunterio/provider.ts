import { defineProvider, presets } from "@shared/core";

/**
 * Hunter (hunter.io) — email intelligence: every address published for a
 * domain, a person's most likely address, SMTP-level verification, free
 * company discovery, a masked cross-company people search with a paid
 * reveal, and person / company enrichment. Thirteen endpoints against
 * `https://api.hunter.io/v2`, auth `X-API-KEY`, billed in Hunter credits
 * (one pool; the pricing page's "search" and "verification" packs are
 * views of the same balance — v1 `GET /account` `requests.credits`).
 *
 * Every endpoint is a single synchronous exchange EXCEPT `/email-verifier`,
 * which owns a `lifecycle.start` / `poll` pair: Hunter answers 202 (still
 * verifying — re-poll the same URL) and 222 (the remote SMTP server
 * misbehaved — terminal, zero-billed), two 2xx codes the declarative path
 * would settle as billable success (design D2).
 *
 * The charging endpoints state their own basis (design D3 — v1's
 * def-level `getActualCost` hooks; rates from
 * hunter.io/api-documentation/v2 and
 * help.hunter.io/en/articles/1970956-hunter-api, 2026-09-17):
 * `domain-search` per started block of ten addresses, `email-finder` per
 * address found, `email-verifier` per definitive verdict,
 * `multi-domain-search/reveal` per fresh reveal with the vendor's
 * `meta.credits_charged` as the claim, and the enrichment trio 0.2 per
 * profile carrying every core data point (a partial profile is a free
 * 200; the miss is a 404 — error-as-data, zero usage). Everything else is
 * FREE. This provider therefore declares NO
 * consolidate and a generic evidence that counts nothing: only the reveal
 * carries a meter, and it is that endpoint's own.
 */
export default defineProvider({
    name: "hunterio",
    meta: {
        displayName: "Hunter",
        summary: "Email intelligence: find, verify, and enrich professional " +
            "email addresses and the companies behind them.",
        description: "Hunter.io — email intelligence for agents: find " +
            "every email address published for a domain (with sources " +
            "and confidence), resolve a person's address from their name " +
            "and company, verify deliverability down to the SMTP level, " +
            "discover companies by firmographic filters or natural " +
            "language, survey reachable people across companies before " +
            "paying to reveal them, and enrich people and companies from " +
            "an email or domain.",
        homepageUrl: "https://hunter.io",
        docsUrl: "https://hunter.io/api-documentation/v2",
        categories: ["people-enrichment", "company-enrichment"],
        notes: [
            "Hunter answers a non-2xx with `{errors: [{id, code, " +
            "details}]}`; 403 is the per-second rate limit and 429 the " +
            "monthly quota — both settle as provider errors with zero " +
            "usage.",
            "An exact repeat of a paid query within the billing period is " +
            "deduplicated free upstream; the usage recorded here is the " +
            "vendor's published rate, not the deduplicated draw.",
        ],
    },
    auth: { inject: presets.auth.header("X-API-KEY") },
    request: { baseUrl: "https://api.hunter.io/v2" },
    // mirrors services/workflows/endpointExecution/config.yml (hunterio):
    // request 30s (email-finder blocks up to 20s upstream), run 60s;
    // email-verifier overrides to 180s with a 10s poll
    timeouts: { requestMs: 30_000, runMs: 60_000 },
    usage: {
        /** ONE pool: Hunter credits (owner decision 2026-09-17, design
         *  D1). The plan's monthly allowance and the bulk "search" /
         *  "verification" packs top up the same balance. */
        credits: { default: { label: "Hunter credits" } },
        /** The generic QUANTITIES default (design D27): the FREE docs and
         *  the flat `discover-ai` gate have nothing to count.
         *  Every metered doc states its own basis (design D3) — there is
         *  no one collection key across them (`data.emails[]`,
         *  `data.email`, `data.status`, `data[].outcome`). */
        evidence: () => ({ counts: {} }),
    },
    output: {
        /** Hunter's error envelope `{errors: [{id, code, details}]}` →
         *  `{message, error_code, raw}` (design D4). A 404 enrichment miss
         *  and the inverted 403 / 429 pair all land here. */
        fromError: ({ data, utils }) => {
            const errors = utils.json.optionalGet(data.output, "$.errors");
            const first = Array.isArray(errors) && errors.length > 0 &&
                    typeof errors[0] === "object" && errors[0] !== null
                ? errors[0] as { id?: unknown; details?: unknown }
                : undefined;
            const details = first?.details;
            const id = first?.id;
            return {
                message: typeof details === "string" && details !== ""
                    ? details
                    : "Hunter API error",
                ...(typeof id === "string" ? { error_code: id } : {}),
                raw: data.output,
            };
        },
    },
});
