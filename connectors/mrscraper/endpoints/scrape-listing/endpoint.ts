import { defineEndpoint, presets, Unit, UsageModelKind } from "@shared/core";
import { zScrapeListingBody } from "./schema/inputs.ts";

/** Playground preset: the `listing` AI agent (`html=true`, `agent:
 *  "listing"` in the body). */
export default defineEndpoint({
    meta: {
        displayName: "Extract Listing Pages",
        summary:
            "Extract items from paginated listings, catalogs, and search results in one run.",
        description: "Point the listing agent at a catalog grid, search " +
            "results page, or any paginated list and it walks the pages " +
            "and extracts the items into structured JSON — one run, " +
            "per-page results keyed by page index with item counts. " +
            "Describe the item fields in plain language. Supports a page " +
            "cap (maxPages), real-browser rendering, waits, resource " +
            "blocking, proxy country selection, and a real-device stealth " +
            "mode. Suited for product catalogs, job boards, directory " +
            "listings, and marketplace search results.",
        docsUrl: "https://docs.mrscraper.com/docs/api/playground/listing-page",
        categories: ["web-extraction"],
        notes: [
            "Billed at the vendor's own token meter: a 5-token trace, 1 " +
            "token per 30 s of runtime, plus AI input/output tokens — " +
            "every swept page adds to it.",
        ],
    },
    /** PUBLIC identity (design D1): the playground's wire path is `/`. */
    endpoint: "/scrape/listing",
    request: {
        method: "POST",
        path: "/",
        baseUrl: "https://api.mrscraper.com",
    },
    auth: { inject: presets.auth.header("x-api-token") },
    timeouts: { requestMs: 330_000, runMs: 330_000 },
    input: {
        schema: { body: zScrapeListingBody },
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(
                utils.json.omit(data.input.body ?? {}, [
                    "geoCode",
                    "proxyCountry",
                    "browserRendering",
                    "waitUntil",
                    "timeout",
                    "blockResources",
                    "waitForSelector",
                    "super",
                ]),
                { agent: "listing" },
            ),
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
        /** 1 token per token (design D3); hold `30 + 20 × pages` (v1's
         *  multi-page worst case, 3 pages when the caller states none). */
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
