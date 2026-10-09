import { defineEndpoint, presets, Unit, UsageModelKind } from "@shared/core";
import { zScrapeExtractBody } from "./schema/inputs.ts";

/** Playground preset: the `general` AI agent (`html=true`, `agent:
 *  "general"` in the body). */
export default defineEndpoint({
    meta: {
        displayName: "Extract Structured Data",
        summary:
            "Extract structured JSON from any page with an AI parser and a natural-language prompt.",
        description:
            "Scrape a single page and parse it into structured JSON with an " +
            "AI agent — describe the fields in plain language instead of " +
            "writing CSS selectors or XPath, or append a Json Schema section " +
            "to shape the output. Returns the extracted JSON under data plus " +
            "the fetched page HTML. Supports real-browser rendering, " +
            "navigation and CSS-selector waits, resource blocking, proxy " +
            "country selection, and a real-device stealth mode. Suited for " +
            "product detail extraction, article metadata, directory " +
            "profiles, and normalizing many sites into one schema.",
        docsUrl: "https://docs.mrscraper.com/docs/api/playground/scrape-json",
        categories: ["web-extraction"],
        notes: [
            "Billed at the vendor's own token meter: a 5-token trace, 1 " +
            "token per 30 s of runtime, plus AI input/output tokens (a " +
            "small page extraction measured 12 tokens in v1's drill).",
        ],
    },
    /** PUBLIC identity (design D1): the playground's wire path is `/`. */
    endpoint: "/scrape/extract",
    request: {
        method: "POST",
        path: "/",
        baseUrl: "https://api.mrscraper.com",
    },
    auth: { inject: presets.auth.header("x-api-token") },
    timeouts: { requestMs: 330_000, runMs: 330_000 },
    input: {
        schema: { body: zScrapeExtractBody },
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
                { agent: "general" },
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
