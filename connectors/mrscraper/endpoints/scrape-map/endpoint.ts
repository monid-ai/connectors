import { defineEndpoint, presets, Unit, UsageModelKind } from "@shared/core";
import { zScrapeMapBody } from "./schema/inputs.ts";

/** Playground preset: the `map` AI agent (`agent: "map"` in the body). */
export default defineEndpoint({
    meta: {
        displayName: "Map Site URLs",
        summary:
            "Crawl a site to discover its URL structure and build seed URL lists.",
        description: "Crawl outward from a starting URL and return every " +
            "discovered URL with a total count — the fastest way to map a " +
            "site's architecture before scraping it page by page, without " +
            "downloading full page content. Supports crawl depth and page " +
            "caps, a URL collection limit, include/exclude URL patterns, " +
            "proxy country selection, and a real-device stealth mode. " +
            "Suited for sitemap discovery, coverage planning, and " +
            "generating seed lists for the scrape endpoints.",
        docsUrl:
            "https://docs.mrscraper.com/docs/api/playground/scrape-sitemap",
        categories: ["web-extraction"],
        notes: [
            "Billed at the vendor's own token meter: a 5-token trace, 1 " +
            "token per 30 s of runtime, plus AI tokens — every crawled " +
            "page adds to it.",
        ],
    },
    /** PUBLIC identity (design D1): the playground's wire path is `/`. */
    endpoint: "/scrape/map",
    request: {
        method: "POST",
        path: "/",
        baseUrl: "https://api.mrscraper.com",
    },
    auth: { inject: presets.auth.header("x-api-token") },
    timeouts: { requestMs: 330_000, runMs: 330_000 },
    input: {
        schema: { body: zScrapeMapBody },
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(
                utils.json.omit(data.input.body ?? {}, [
                    "geoCode",
                    "proxyCountry",
                    "timeout",
                    "super",
                ]),
                { agent: "map" },
            ),
            queryParams: {
                saveResult: false,
                ...utils.json.pick(data.input.body ?? {}, [
                    "$.geoCode",
                    "$.proxyCountry",
                    "$.timeout",
                    "$.super",
                ]),
            },
        }),
    },
    usage: {
        /** 1 token per token (design D3); hold `30 + 20 × pages`. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.TOKEN,
            label: "tokens",
            description: "vendor tokens the run consumed (token_usage)",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: ({ data }) => ({
            counts: { TOKEN: 30 + 20 * (data.input.body.maxPages ?? 3) },
        }),
        evidence: ({ data, utils }) => {
            const used = utils.json.optionalGet(data.output, "$.token_usage");
            return { counts: { TOKEN: typeof used === "number" ? used : 0 } };
        },
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.token_usage",
            );
            return {
                credits: {
                    ...(typeof value === "number" ? { default: value } : {}),
                },
                output: rest,
            };
        },
    },
    output: {
        fromResponse: ({ data, utils }) =>
            utils.json.omit(data.output, [
                "residential_proxy_usage",
                "data_path",
                "html_path",
                "listen_network_data",
            ]),
    },
});
