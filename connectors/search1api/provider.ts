import { defineProvider, presets } from "@shared/core";

/**
 * Search1API (s1.dev) — live web data for agents: web search, news, page
 * crawling, sitemap discovery, and trending topics over
 * `https://api.search1api.com` with `Authorization: Bearer <key>`.
 *
 * Rate card (https://s1.dev/pricing, verified 2026-09-17): every endpoint
 * here costs 1 Search1API credit per call — except `/search` and `/news`
 * with `crawl_results > 0` ("Deep Search"), which add 1 credit per
 * successfully crawled page; the endpoints model that as COMPOSITE.
 * The vendor also charges a completed search that returns nothing
 * (https://s1.dev/docs/essentials/credits-and-limits); Monid does not
 * pass that on, so `search`, `news`, `sitemap` and `trending` count the
 * call off the response and bill it only when the result list is
 * non-empty — `crawl` stays flat. Responses carry no usage meter, so
 * there is no `consolidate` — the derived fold is the bill.
 *
 * `/search`, `/news` and `/crawl` also accept a BATCH array body (one
 * credit per item); the connector mirrors the single-object form only —
 * batching is the same verb repeated.
 *
 * Vendor non-2xx is DATA: errors arrive as `{detail}` or an RFC-9457
 * problem body (`{title, detail, status}` — 402 x402 payment challenges
 * included), which `output.fromError` normalizes here.
 */
export default defineProvider({
    name: "search1api",
    meta: {
        displayName: "Search1API",
        summary: "Live web search, news, page crawling, sitemap, and " +
            "trending topics — 1 credit per call with results.",
        description: "Search1API gives agents live web data through five " +
            "simple endpoints: web search across Google, Bing, Bing CN, " +
            "DuckDuckGo, Yahoo, Yandex, YouTube, X, Reddit, GitHub, arXiv, WeChat, " +
            "Bilibili, IMDb, Wikipedia and the Chinese engines (Baidu, " +
            "360, Quark); a dedicated news vertical; single-URL page " +
            "crawling to clean Markdown; sitemap link discovery; and " +
            "trending topics from GitHub and Hacker News. One API key, " +
            "flat per-call pricing — the free plan includes 100 credits " +
            "at https://s1.dev.",
        homepageUrl: "https://s1.dev",
        docsUrl: "https://s1.dev/docs",
        categories: ["web-search"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.search1api.com" },
    timeouts: { requestMs: 60_000, runMs: 60_000 },
    usage: {
        /** THE credit system (design D26): Search1API meters in its OWN
         *  credits — 1 credit per call on every endpoint here (the public
         *  card prices each at $0.003; the $/credit conversion stays the
         *  broker card's one search1api row). */
        credits: { default: { label: "Search1API credits" } },
    },
    output: {
        /** Search1API error envelopes: `{detail: "..."}` on ordinary 4xx and
         *  RFC-9457 problem bodies (`{type, title, status, detail}`) on the
         *  402 x402 challenge. Read `detail` first, then `title`. */
        fromError: ({ data, utils }) => {
            const detail = utils.json.optionalGet(data.output, "$.detail");
            const title = utils.json.optionalGet(data.output, "$.title");
            const message = utils.json.optionalGet(data.output, "$.message");
            const text = [detail, title, message].find((v) =>
                typeof v === "string" && v !== ""
            );
            return {
                message: typeof text === "string" ? text : "Search1API error",
                raw: data.output,
            };
        },
    },
});
