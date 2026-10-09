import { defineEndpoint, presets, Unit, UsageModelKind } from "@shared/core";
import { zScrapeMarkdownBody } from "./schema/inputs.ts";

/** Playground preset: any page as clean Markdown (`markdown=true`). */
export default defineEndpoint({
    meta: {
        displayName: "Scrape Markdown",
        summary:
            "Convert any page into clean, LLM-ready Markdown via anti-bot bypass and proxies.",
        description: "Turn any URL into clean Markdown with HTML " +
            "boilerplate stripped — navigation, scripts, and ads removed, " +
            "headings, lists, code blocks, and links kept — ready for " +
            "prompts, RAG, and analysis; typically 70-90% smaller than the " +
            "HTML. Anti-bot bypass, rotating proxies, and geo-targeting are " +
            "handled server-side. Supports real-browser rendering, " +
            "navigation and CSS-selector waits, resource blocking, proxy " +
            "country selection, and a real-device stealth mode.",
        docsUrl:
            "https://docs.mrscraper.com/docs/api/playground/scrape-markdown",
        categories: ["web-extraction"],
        notes: [
            "Billed at the vendor's own token meter: 1 token per 30 s of " +
            "runtime plus 1 per 0.25 MB of bandwidth, rounded up (a simple " +
            "page is 1-2 tokens).",
        ],
    },
    /** PUBLIC identity (design D1): the playground's wire path is `/`. */
    endpoint: "/scrape/markdown",
    request: {
        method: "POST",
        path: "/",
        baseUrl: "https://api.mrscraper.com",
    },
    auth: { inject: presets.auth.header("x-api-token") },
    timeouts: { requestMs: 330_000, runMs: 330_000 },
    input: {
        schema: { body: zScrapeMarkdownBody },
        /** The preset: `markdown=true` (design D2). */
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
                markdown: true,
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
        /** 1 token per token (design D3); hold 20. */
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
