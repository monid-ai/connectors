import { defineEndpoint, presets, Unit, UsageModelKind } from "@shared/core";
import { zScrapeHtmlBody } from "./schema/inputs.ts";

/** Playground preset: raw HTML of any page (`POST https://api.mrscraper.com/`
 *  with `html=true`). */
export default defineEndpoint({
    meta: {
        displayName: "Scrape Raw HTML",
        summary:
            "Fetch the raw HTML of any page through anti-bot bypass and rotating proxies.",
        description: "Return the raw DOM markup of any URL with anti-bot " +
            "bypass, rotating proxies, and geo-targeting handled " +
            "server-side. Supports real-browser rendering with " +
            "configurable navigation waits, CSS-selector waits, resource " +
            "blocking, proxy country selection, and a real-device stealth " +
            "mode for hard anti-bot walls. Suited for feeding custom " +
            "parsers, HTML archiving, meta/SEO structure audits, and " +
            "debugging extraction pipelines.",
        docsUrl:
            "https://docs.mrscraper.com/docs/api/v3/scraper/unblocker-scraping",
        categories: ["web-extraction"],
        notes: [
            "Billed at the vendor's own token meter: 1 token per 30 s of " +
            "runtime plus 1 per 0.25 MB of bandwidth, rounded up (a simple " +
            "page is 1-2 tokens).",
        ],
    },
    /** PUBLIC identity (design D1): the playground's wire path is `/` —
     *  seven presets share it — so the id is v1's. */
    endpoint: "/scrape/html",
    // the playground host (design D2): its own auth header, its own budget
    // (the upstream page-load budget alone can be 300 s)
    request: {
        method: "POST",
        path: "/",
        baseUrl: "https://api.mrscraper.com",
    },
    auth: { inject: presets.auth.header("x-api-token") },
    timeouts: { requestMs: 330_000, runMs: 330_000 },
    input: {
        schema: { body: zScrapeHtmlBody },
        /** The preset: `html=true` selects the operation, `saveResult=
         *  false` keeps the run out of the vendor account's shared Results
         *  store, and the option fields move from the body to the query
         *  string the upstream reads them from (design D2). */
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.omit(data.input.body ?? {}, [
                "geoCode",
                "proxyCountry",
                "browserRendering",
                "waitUntil",
                "timeout",
                "blockResources",
                "waitForSelector",
                "super",
            ]),
            queryParams: {
                html: true,
                saveResult: false,
                ...utils.json.pick(data.input.body ?? {}, [
                    "$.geoCode",
                    "$.proxyCountry",
                    "$.browserRendering",
                    "$.waitUntil",
                    "$.timeout",
                    "$.blockResources",
                    "$.waitForSelector",
                    "$.super",
                ]),
            },
        }),
    },
    usage: {
        /** 1 token per token (design D3): the playground bills the
         *  vendor's variable meter, so the line IS the unit. Hold 20 (v1's
         *  drill-informed worst case for a flat scrape). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.TOKEN,
            label: "tokens",
            description: "vendor tokens the run consumed (token_usage)",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: () => ({ counts: { TOKEN: 20 } }),
        evidence: ({ data, utils }) => {
            const used = utils.json.optionalGet(data.output, "$.token_usage");
            return { counts: { TOKEN: typeof used === "number" ? used : 0 } };
        },
        /** The playground's claim rides the flat body as `token_usage`
         *  (design D3) — pluck it; entry omitted when absent. */
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
        /** Playground internals never reach a caller (v1
         *  stripPlaygroundInternal): the proxy meter and the paths inside
         *  the vendor's own storage, unreadable without its account. */
        fromResponse: ({ data, utils }) =>
            utils.json.omit(data.output, [
                "residential_proxy_usage",
                "data_path",
                "html_path",
                "listen_network_data",
            ]),
    },
});
