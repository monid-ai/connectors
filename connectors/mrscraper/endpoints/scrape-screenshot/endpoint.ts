import { defineEndpoint, presets, Unit, UsageModelKind } from "@shared/core";
import { zScrapeScreenshotBody } from "./schema/inputs.ts";

/** Playground preset: a rendered screenshot (`html=true&browserRendering=
 *  true&screenshot=full`). */
export default defineEndpoint({
    meta: {
        displayName: "Capture Page Screenshot",
        summary:
            "Capture a full-page or viewport screenshot of any rendered page.",
        description: "Render any URL in a real browser and capture a " +
            "screenshot — the entire scroll height or just the top " +
            "viewport — returned base64-encoded in the screenshot field " +
            "alongside the page HTML. Anti-bot bypass, proxies, and " +
            "geo-targeting are handled server-side. Supports navigation " +
            "and CSS-selector waits, proxy country selection, and a " +
            "real-device stealth mode. Suited for visual audits, layout " +
            "verification, archiving, and debugging why an extraction " +
            "sees a different page than a human does.",
        docsUrl:
            "https://docs.mrscraper.com/docs/api/playground/get-screenshot",
        categories: ["web-extraction"],
        notes: [
            "The image comes back inline as a base64 string (a full-page " +
            "capture can be several megabytes).",
            "Billed at the vendor's own token meter: 1 token per 30 s of " +
            "runtime plus 1 per 0.25 MB of bandwidth, rounded up.",
        ],
    },
    /** PUBLIC identity (design D1): the playground's wire path is `/`. */
    endpoint: "/scrape/screenshot",
    request: {
        method: "POST",
        path: "/",
        baseUrl: "https://api.mrscraper.com",
    },
    auth: { inject: presets.auth.header("x-api-token") },
    timeouts: { requestMs: 330_000, runMs: 330_000 },
    input: {
        schema: { body: zScrapeScreenshotBody },
        /** The preset (design D2): screenshots need the real browser;
         *  `screenshot=full` is the default area and a caller's value
         *  overrides it (the lifted options spread last). */
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.omit(data.input.body ?? {}, [
                "screenshot",
                "geoCode",
                "proxyCountry",
                "waitUntil",
                "timeout",
                "waitForSelector",
                "super",
            ]),
            queryParams: {
                html: true,
                browserRendering: true,
                screenshot: "full",
                saveResult: false,
                ...utils.json.pick(data.input.body ?? {}, [
                    "$.screenshot",
                    "$.geoCode",
                    "$.proxyCountry",
                    "$.waitUntil",
                    "$.timeout",
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
