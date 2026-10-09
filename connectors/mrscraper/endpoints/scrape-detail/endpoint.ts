import { defineEndpoint, presets, Unit, UsageModelKind } from "@shared/core";
import { zScrapeDetailBody } from "./schema/inputs.ts";

/** Playground preset: the `detail` AI agent (`html=true`, `agent:
 *  "detail"` in the body). */
export default defineEndpoint({
    meta: {
        displayName: "Extract Detail Page",
        summary:
            "Extract a product, property, hotel, job, or article detail page into typed fields.",
        description:
            "Scrape one detail page with the vendor's detail agent, which " +
            "picks the field set for the page type on its own: products " +
            "(title, price, condition, brand, specifics, seller, shipping, " +
            "images), property listings (address, price, beds, baths, " +
            "sqft, facts), hotels, job postings, and articles. Returns the " +
            "extracted JSON under data plus the fetched page HTML; a " +
            "prompt is optional and only steers the parse. Works on any " +
            "site, including ones without a fixed-price scraper (v1 " +
            "measured eBay at 57 tokens, Zillow at 32). Suited for " +
            "normalizing detail pages across many sites into one schema.",
        docsUrl: "https://docs.mrscraper.com/docs/features/ai-scraper/general",
        categories: ["web-extraction"],
        notes: [
            "Billed at the vendor's own token meter: a 5-token trace, 1 " +
            "token per 30 s of runtime, plus AI input/output tokens (a " +
            "small page extraction measured 12 tokens in v1's drill).",
        ],
    },
    /** PUBLIC identity (design D1): the playground's wire path is `/`. */
    endpoint: "/scrape/detail",
    request: {
        method: "POST",
        path: "/",
        baseUrl: "https://api.mrscraper.com",
    },
    auth: { inject: presets.auth.header("x-api-token") },
    timeouts: { requestMs: 330_000, runMs: 330_000 },
    input: {
        schema: { body: zScrapeDetailBody },
        /** The preset (design D2): `html=true` plus the agent pinned in
         *  the body — a caller cannot select another agent. */
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
                { agent: "detail" },
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
        /** 1 token per token (design D3); hold 50 (v1's AI-extraction
         *  worst case). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.TOKEN,
            label: "tokens",
            description: "vendor tokens the run consumed (token_usage)",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: () => ({ counts: { TOKEN: 50 } }),
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
