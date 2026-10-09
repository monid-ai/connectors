import { defineProvider, presets } from "@shared/core";

/**
 * Context.dev (context.dev) — the web-context API, ported from
 * monid-services `adaptors/contextdev` (v1 slug `context.dev`; a provider
 * name here cannot carry a dot — design D1). Nineteen synchronous JSON
 * endpoints on ONE wire surface, `https://api.context.dev/v1/<path>`,
 * Bearer auth: GETs carry their input as scalar query params, POSTs as a
 * JSON body. Results come back inline; nothing polls.
 *
 * BILLING (design D3). Context.dev meters everything in CREDITS at
 * published per-endpoint rates (https://www.context.dev/pricing, checked
 * 2026-09-17) and EVERY response — success or error — reports the credits
 * the call consumed in `key_metadata.credits_consumed`. That is the
 * vendor's claim (akta's posture): the provider `consolidate` plucks the
 * whole `key_metadata` envelope, claims `credits_consumed`, and strips the
 * envelope from the output in the same motion — `credits_remaining` is
 * OUR account balance and never reaches a caller. The derived fold is the
 * cross-check (`usage.mismatch.derived` on disagreement), which is how a
 * call the vendor bills above list (a PDF page OCR'd during a crawl, a
 * search with inline Markdown) settles at the real cost.
 *
 * The same envelope rides ERROR bodies, which relay as data — so
 * `output.fromError` digests them without it (design D4). No `toRequest`:
 * the wire is the schema.
 */
export default defineProvider({
    name: "contextdev",
    meta: {
        displayName: "Context.dev",
        summary:
            "Web context: scrape, crawl, search, extract, and brand intelligence.",
        description: "The unified web context API for agents — scrape any " +
            "URL to clean Markdown or rendered HTML, crawl a whole site for " +
            "RAG, search the web with inline page content, extract " +
            "schema-shaped JSON, enumerate sitemaps and page images, capture " +
            "screenshots, search company news, enrich people from identity " +
            "clues, and resolve brand, industry (NAICS/SIC), product, and " +
            "design-system intelligence for any company — one key, no " +
            "crawlers, browsers, or proxies to run.",
        homepageUrl: "https://context.dev",
        docsUrl: "https://docs.context.dev",
        categories: ["web-extraction", "web-search", "company-enrichment"],
        notes: [
            "Failed and blocked requests are not billed: credits are " +
            "consumed only on successful responses, and the response's own " +
            "credit count settles the bill.",
            "A request that hits its deadline fails with 408 at no charge " +
            "unless timeoutOpts.behavior is return-partial, which returns " +
            "what was collected so far and bills it.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.context.dev/v1" },
    // mirrors services/workflows/endpointExecution/config.yml (context.dev):
    // request 60s, run 60s for the single-page scrapes and lookups; the
    // slow endpoints (crawl, extract, search, screenshot, styleguide,
    // products) override, as v1's defs did.
    timeouts: { requestMs: 60_000, runMs: 60_000 },
    usage: {
        /** THE credit system (design D3): Context.dev meters ONE pool of
         *  API credits per organization, so the pool is that unit and the
         *  id is `default`. The $/credit of the plan (v1: $0.0009 on the
         *  Pro overage rate) is the broker card's job, not the doc's. */
        credits: {
            default: {
                label: "Context.dev credits",
                description: "the organization's API credit balance; " +
                    "each endpoint states its published draw",
            },
        },
        /** The vendor's OWN claim (design D27): every Context.dev
         *  response reports `key_metadata.credits_consumed` — pluck the
         *  envelope (read + strip, one motion). Entry OMITTED when the
         *  count is absent (never `?? 0`); a present 0 (a cached brand
         *  lookup, a free search) prunes to an empty claim and the derived
         *  fold settles. The claim WINS at settle; the fold is the
         *  cross-check. The envelope leaves the output whole because its
         *  other field, `credits_remaining`, is our balance. v1 lineage:
         *  providerGetActualCost + providerFormatOutput, one fn. */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.key_metadata",
            );
            const consumed = utils.json.optionalGet(
                value ?? null,
                "$.credits_consumed",
            );
            return {
                credits: {
                    ...(typeof consumed === "number"
                        ? { default: consumed }
                        : {}),
                },
                output: rest,
            };
        },
    },
    output: {
        /** THE error-digestion hook: Context.dev errors are real non-2xx
         *  `{ message, error_code, key_metadata, request_id }` bodies.
         *  Runs only on provider errors, after zero-usage forcing; the
         *  raw body rides under `raw` — digest, never hide — MINUS the
         *  `key_metadata` envelope, whose `credits_remaining` is our
         *  account balance (v1 redacted it at the transport boundary for
         *  exactly this path; design D4). */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(data.output, "$.message");
            const code = utils.json.optionalGet(data.output, "$.error_code");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "Context.dev API error",
                ...(typeof code === "string" ? { error_code: code } : {}),
                raw: utils.json.omit(data.output, ["key_metadata"]),
            };
        },
    },
});
