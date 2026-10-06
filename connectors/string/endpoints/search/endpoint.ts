import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSearchBody } from "./schema/inputs.ts";

/**
 * `POST /v1/search` — search Google, DuckDuckGo, Brave, or Mojeek and get
 * ranked organic results back.
 *
 * BILLING, from String's own published docs (not third-party reverse
 * engineering — get-started/pricing and api-reference/search on
 * portal.usestring.ai/docs, read 2026-10-06): every search is billed as
 * one "browser standard rate" request. Without `searchCount`, one request
 * is always exactly one billed page. WITH `searchCount`, only the
 * `google` engine is paged: the API keeps fetching further Google results
 * pages (up to 36) until `searchCount` organic results are collected or
 * the time budget runs out, and "each page that answered is billed as one
 * search." `duckduckgo`, `brave`, and `mojeek` return their one results
 * page, cut to `searchCount` — always exactly one billed page.
 *
 * ESTIMATE is an admission hold, not a best guess: it must not undershoot
 * what settlement can actually charge. Without `searchCount`, always 1
 * page. With it, on `google` (the default when `engine` is omitted):
 * String's docs describe a hard 36-page cap and settlement reads whatever
 * `paging.pages` the response reports, which can land anywhere up to that
 * cap — so the hold reserves the full 36 rather than a per-page-count
 * heuristic that could settle under what it promised. Any non-google
 * engine always estimates 1, since it never pages.
 *
 * SETTLE: reads `paging.pages` from the response when present (String
 * only sends it when `searchCount` was in the request); otherwise 1.
 *
 * PRICING: String's rate is plan-tier USD ($1.50/1,000 on Starter, $1.00/
 * 1,000 on Growth — portal.usestring.ai/docs/get-started/pricing
 * "Search", retrieved 2026-09-22), not a vendor "credits" abstraction, and
 * the response carries no billing receipt to read at settle time. Quoted
 * here at the Growth-tier rate ($0.001/page) — a deliberate choice, not a
 * guess.
 */
export default defineEndpoint({
    meta: {
        displayName: "String Search",
        summary: "Search Google, DuckDuckGo, Brave, or Mojeek and get " +
            "ranked organic results back.",
        description: "Search the web and get ranked organic results " +
            "back. `engine` selects Google (default), DuckDuckGo, Brave, " +
            "or Mojeek; `country` and `language` localize results. " +
            "`searchCount` (1-300) asks for more organic results than a " +
            "single page carries — on Google this re-fetches further " +
            "results pages (up to 36) until enough are collected, " +
            "billing one search per page fetched; the other engines " +
            "always return one page. Google responses can " +
            "also carry ads, local-pack places, a knowledge panel, " +
            "related searches, People Also Ask, AI overviews, and other " +
            "rendered surfaces alongside the ranked results.",
        docsUrl: "https://portal.usestring.ai/docs/api-reference/search",
        categories: ["web-search"],
    },
    request: { method: "POST", path: "/search" },
    input: {
        schema: {
            body: zSearchBody.extend({
                engine: zSearchBody.shape.engine.unwrap().default("google"),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.PAGE,
            label: "search pages",
            description: "each results page fetched, billed as one " +
                "search, at the Growth-tier rate ($1.00/1,000)",
            consumes: { credit: "default", amount: 0.001 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            if (body.engine !== "google" || body.searchCount === undefined) {
                return { counts: { PAGE: 1 } };
            }
            // Hold the documented 36-page cap, not a per-page-count
            // guess: settlement reads the real `paging.pages` and must
            // never be able to charge more than this hold reserved.
            return { counts: { PAGE: 36 } };
        },
        evidence: ({ data, utils }) => {
            const pages = utils.json.optionalNum(
                data.output,
                "$.paging.pages",
            );
            return { counts: { PAGE: pages ?? 1 } };
        },
    },
});
