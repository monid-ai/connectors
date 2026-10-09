import { defineProvider, presets } from "@shared/core";

/**
 * Litescrape (litescrape.com) — live search-engine and marketplace results
 * as JSON: Google Search, AI Overview, AI Mode, Ads, Local, Shopping, and
 * Maps (places, reviews, posts, foot traffic, photos), Bing and DuckDuckGo
 * search and maps, Apple Maps places and reviews, Yelp and Tripadvisor
 * search, places, and reviews, and Google Play and Apple App Store
 * listings, products, and reviews. Thirty-three synchronous GETs on ONE
 * host (`https://api.litescrape.com/api/<engine>/<kind>`) with ONE Bearer
 * key, so the akta shape: both provider-wide hooks live here and every
 * endpoint inherits them.
 *
 * BILLING (design D2 / D3): the vendor sells prepaid credits at one flat
 * price — $0.15 per 1,000 calls across every endpoint
 * (https://litescrape.com/pricing, captured 2026-09-16; v1
 * `makePerCallPrice(0.00015)`) — and deducts ONE credit per HTTP 200,
 * including an empty success (v1 drill 2026-09-18, 68 calls reconciled
 * against `GET /api/keys/status`). No response carries a meter, so there
 * is no `consolidate`; the pool is the vendor's own credits (owner
 * decision 2026-09-20) and every endpoint's line is one credit. The owner
 * kept v1's posture on empties (2026-09-20): a 200 whose body carries none
 * of the endpoint's result groups records 0, so each endpoint states its
 * own 0|1 evidence over v1's `RESULT_GROUPS` and the provider promises
 * one call in the estimate.
 *
 * OUTPUT (owner decision 2026-09-20, design D5): every response embeds
 * ready-made `https://api.litescrape.com/api/...` follow-up links
 * (`pagination.next`, `reviews_link`, `litescrape_pagination.*`, the
 * `raw_file` / `prettify_file` archive links). v1 rewrote them into
 * `{ endpoint, queryParams }` by consulting the catalog and each target's
 * schema; a hook fn is a closed term and cannot, so they are relayed
 * VERBATIM and the provider note below says how they map. No
 * `fromResponse`.
 *
 * Timeouts mirror services/workflows/endpointExecution/config.yml
 * (litescrape): 120 s request / 120 s run — AI Mode, AI Overview, and
 * Google Ads take ~55 s live (v1 drill), vendor bound 120 s.
 */
export default defineProvider({
    name: "litescrape",
    meta: {
        displayName: "Litescrape",
        summary: "Live Google, Bing, DuckDuckGo, Apple, Yelp, Tripadvisor, " +
            "Google Play, and App Store results as JSON.",
        description: "Live search-engine and marketplace results as JSON: " +
            "Google Search, AI Overview, AI Mode, Ads, Local, Shopping, " +
            "and Maps (places, reviews, posts, foot traffic, photos), " +
            "Bing and DuckDuckGo search and maps, Apple Maps places and " +
            "reviews, Yelp and Tripadvisor search, places, and reviews, " +
            "and Google Play and Apple App Store listings, products, and " +
            "reviews. One flat price per request across every endpoint, " +
            "multi-page results counted as one call (100 reviews, 50 " +
            "Apple places), and ready-made follow-up requests returned " +
            "with every result. Every call scrapes the source live, so AI " +
            "answers and ad pages can take up to a minute; the app-store " +
            "and ads endpoints are upstream alpha and their fields may " +
            "change.",
        homepageUrl: "https://litescrape.com",
        docsUrl: "https://litescrape.com/docs",
        categories: ["web-search", "maps"],
        /** Provider-wide caveats (concatenated before each endpoint's). */
        notes: [
            "Every successful response embeds ready-made follow-up links " +
            "of the form https://api.litescrape.com/api/<path>?<query> " +
            "(pagination.next, litescrape_pagination.*, reviews_link, " +
            "photo_meta_link, litescrape_*_link). They are relayed " +
            "verbatim: <path> is this connector's endpoint id " +
            "(litescrape#<path>) and the query string is its queryParams.",

            "search_metadata.json_endpoint echoes the request; " +
            "search_metadata.raw_file / prettify_file / raw_html_file / " +
            "prettify_html_file link the vendor's retained raw-response " +
            "archive (seven days, key required, no extra charge).",

            "The vendor deducts one credit per HTTP 200, including an " +
            "empty success; usage here records 0 for a 200 that carries " +
            "none of the endpoint's result groups (v1 posture). Every " +
            "non-2xx (400 invalid_request for a missing, oversized, or " +
            "unknown parameter, 401, 402 credits exhausted, 404, 429, 503) " +
            "settles as a provider error with zero usage.",

            "AI Mode, AI Overview, and Google Ads take about a minute per " +
            "call; everything else 3-10 seconds. Concurrency is 25 " +
            "requests per key; the upstream queues beyond that.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    // The `/api` prefix rides the base URL: endpoint paths are the
    // `/<engine>/<kind>` the vendor's docs are keyed by, so the compiled id
    // is `litescrape#google/search` (design D1).
    request: { baseUrl: "https://api.litescrape.com/api" },
    timeouts: { requestMs: 120_000, runMs: 120_000 },
    input: {
        /** Litescrape documents its three list parameters (Apple `muid`,
         *  Yelp `rating` and `attrs`) as ONE comma-separated value — the
         *  engine sends arrays as repeated keys, so this generic hook
         *  joins every array leaf before the wire (the akta hook, verbatim;
         *  v1 rendered the same URLs with akta's `buildQueryUrl`). */
        toRequest: ({ data }) => ({
            ...data.input,
            queryParams: Object.fromEntries(
                Object.entries(data.input.queryParams ?? {}).map((
                    [key, value],
                ) => [key, Array.isArray(value) ? value.join(",") : value]),
            ),
        }),
    },
    output: {
        /** Litescrape's stable error body (litescrape.com/docs/reference,
         *  "Stable error bodies"): `{ error, error_code, status_code,
         *  request_id, retryable }` → `{ message, error_code, raw }`
         *  (design D4). Runs only on provider-error envelopes, after the
         *  engine forced zero usage; the raw body rides under `raw`. */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(data.output, "$.error");
            const code = utils.json.optionalGet(data.output, "$.error_code");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "Litescrape API error",
                ...(typeof code === "string" ? { error_code: code } : {}),
                raw: data.output,
            };
        },
    },
    usage: {
        /** THE credit system (design D26): Litescrape bills a prepaid
         *  balance of calls it names credits (`remaining_calls` on the key
         *  status, "each successful page request costs one credit" in the
         *  Maps docs) — one pool ⇒ id `default`. The $0.15 per 1,000 is
         *  the broker card's job, not the doc's (owner decision
         *  2026-09-20, design D2). */
        credits: { default: { label: "Litescrape credits" } },
        /** The one-call promise every endpoint inherits (design D3): the
         *  hold is one credit, settled 0|1 by the endpoint's own evidence.
         *  No consolidate — no response carries a meter. */
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
