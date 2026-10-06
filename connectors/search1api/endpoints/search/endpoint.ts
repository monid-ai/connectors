import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSearchBody } from "./schema/inputs.ts";

/**
 * `POST /search` — web search across Google, Bing, Bing CN, DuckDuckGo,
 * Yahoo, Yandex, YouTube, X, Reddit, GitHub, arXiv, WeChat, Bilibili, IMDb,
 * Wikipedia and the Chinese engines (Baidu, 360, Quark).
 *
 * Vendor rate card (https://s1.dev/pricing, verified 2026-09-17): 1 credit
 * per call, PLUS 1 credit per successfully crawled page when
 * `crawl_results > 0` ("Deep Search") — a COMPOSITE of a `call` and a
 * metered `crawled_page`, both counted off the response: `call` is 1 only
 * when `results` is non-empty (the vendor still charges a completed empty
 * search; Monid does not pass that on), and results that carry a
 * `content` field are the crawled ones.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search1API Web Search",
        summary: "Search the live web across 18 backends, with optional " +
            "full-page retrieval in the same call.",
        description: "Search the live web and get ranked results " +
            "({title, link, snippet}). `search_service` picks the " +
            "backend — Google, Bing, Bing CN, DuckDuckGo, Yahoo, Yandex, " +
            "YouTube, X, Reddit, GitHub, arXiv, WeChat, Bilibili, IMDb, " +
            "Wikipedia, or the Chinese engines (Baidu, 360, Quark); omit " +
            "it for the vendor default. `time_range` filters to a " +
            "freshness window (day/week/month/year) and `include_sites` " +
            "/ `exclude_sites` shape the domains. Set `crawl_results` " +
            "to also fetch the top results' full page content in the " +
            "same call (+1 credit per crawled page) — or pipe a chosen " +
            "URL to `search1api#crawl` for clean Markdown.",
        docsUrl: "https://s1.dev/docs/basic/search",
        categories: ["web-search"],
        notes: [
            "1 Search1API credit per call that returns results (an " +
            "empty `results` is not billed); `crawl_results > 0` adds 1 " +
            "credit per successfully crawled page.",
            "The API also accepts a batch array (one credit per item); " +
            "this connector exposes the single-object form.",
        ],
    },
    request: { method: "POST", path: "/search" },
    input: { schema: { body: zSearchBody } },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                call: {
                    kind: UsageModelKind.PER_UNIT,
                    consumes: { credit: "default", amount: 1 },
                    unit: Unit.RESULT,
                    label: "search calls with results",
                    description:
                        "one /search call that returned at least one result",
                },
                crawled_page: {
                    kind: UsageModelKind.PER_UNIT,
                    consumes: { credit: "default", amount: 1 },
                    unit: Unit.PAGE,
                    label: "crawled pages",
                    description:
                        "deep-search page retrievals (crawl_results > 0)",
                },
            },
        },
        /** Worst case: a non-empty call plus the requested `crawl_results`,
         *  capped by the number of results a page can return (vendor
         *  max_results default 5). */
        estimate: ({ data }) => {
            const want = data.input.body.crawl_results ?? 0;
            const max = data.input.body.max_results ?? 5;
            const n = Math.min(want, max);
            return {
                counts: n > 0 ? { call: 1, crawled_page: n } : { call: 1 },
            };
        },
        /** The call bills only when `results` is non-empty — an empty
         *  answer is free to the buyer (Monid absorbs the vendor's
         *  credit). Crawled pages count SUCCESSFUL crawls — results that
         *  came back carrying a `content` field. */
        evidence: ({ data, utils }) => {
            const results = utils.json.optionalGet(data.output, "$.results");
            const call = Array.isArray(results) && results.length > 0 ? 1 : 0;
            const n = Array.isArray(results)
                ? results.filter((r) =>
                    typeof r === "object" && r !== null &&
                    typeof (r as Record<string, unknown>).content ===
                        "string" &&
                    ((r as Record<string, unknown>).content as string)
                            .length > 0
                ).length
                : 0;
            return { counts: n > 0 ? { call, crawled_page: n } : { call } };
        },
    },
});
