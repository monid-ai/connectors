import { defineProvider, presets } from "@shared/core";

/**
 * Venice (venice.ai) — private, uncensored AI inference: chat across open
 * and frontier models, embeddings, image generation, and web search /
 * scrape augmentation, behind one Bearer-auth JSON API at
 * `https://api.venice.ai/api/v1`.
 *
 * Rate card (https://docs.venice.ai/overview/pricing and `GET /models`,
 * verified 2026-10-08): every price Venice publishes is in US dollars, so
 * the pool IS dollars. `/chat/completions` reports its own charge on every
 * response as `cost: {usd, diem}` — that is the vendor claim (D27) and is
 * consolidated here, at provider level, for every endpoint that carries it.
 * The other endpoints report no meter, so their pinned rate cards are the
 * bill.
 *
 * `diem` is Venice's staked-compute balance, priced 1:1 with USD on the
 * public rate card: a request is charged in exactly one of the two, so the
 * claim is their sum.
 *
 * Vendor non-2xx is DATA: Venice error bodies are `{error, details?}`, which
 * `output.fromError` normalizes.
 */
export default defineProvider({
    name: "venice",
    meta: {
        displayName: "Venice",
        summary: "Private, uncensored AI: chat, embeddings, images, and " +
            "web search behind one key.",
        description: "Venice is a privacy-first AI inference platform. " +
            "Chat with open and frontier models — Venice-hosted private " +
            "models whose prompts are never stored or logged, including " +
            "uncensored ones — or with frontier models through anonymized " +
            "proxying; embed text for retrieval; generate images, including " +
            "with safe mode off; and search or scrape the live web with " +
            "zero-data-retention backends. Prompts and outputs are not " +
            "stored on Venice servers for private models.",
        homepageUrl: "https://venice.ai",
        docsUrl: "https://docs.venice.ai",
        categories: [
            "text-generation",
            "embeddings",
            "image-generation",
            "web-search",
            "web-scraping",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.venice.ai/api/v1" },
    timeouts: { requestMs: 120_000, runMs: 180_000 },
    usage: {
        /** THE credit system (design D26): Venice publishes every rate in
         *  US dollars and bills one balance, so the pool IS dollars. */
        credits: { default: { label: "US dollars" } },
        /** The vendor's OWN claim (design D27): chat responses carry
         *  `cost: {usd, diem}` — pluck the node out of the payload and sum
         *  the two (a request is charged in one currency, both priced 1:1).
         *  Absent or null on endpoints that report no meter — the entry is
         *  then OMITTED and the derived fold settles. */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(data.output, "$.cost");
            const usd = value === undefined || value === null
                ? undefined
                : utils.json.optionalNum(value, "$.usd");
            const diem = value === undefined || value === null
                ? undefined
                : utils.json.optionalNum(value, "$.diem");
            const total = usd === undefined && diem === undefined
                ? undefined
                : (usd ?? 0) + (diem ?? 0);
            return {
                credits: {
                    ...(total !== undefined && total > 0
                        ? { default: total }
                        : {}),
                },
                output: rest,
            };
        },
    },
    output: {
        /** Venice error envelopes: `{error: string, details?: object}`;
         *  a few upstream failures nest the text as `{error: {message}}`. */
        fromError: ({ data, utils }) => {
            const flat = utils.json.optionalGet(data.output, "$.error");
            const nested = utils.json.optionalGet(
                data.output,
                "$.error.message",
            );
            const text = [flat, nested].find((v) =>
                typeof v === "string" && v !== ""
            );
            return {
                message: typeof text === "string" ? text : "Venice API error",
                raw: data.output,
            };
        },
    },
});
