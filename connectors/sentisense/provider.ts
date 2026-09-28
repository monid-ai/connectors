import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * SentiSense (sentisense.ai): US stock market data built for agents.
 * Sentiment, the SentiSense Score and Rating, insider, congressional and
 * 13F disclosures, options positioning, and AI-clustered news stories.
 *
 * Every endpoint is a synchronous GET against
 * `https://app.sentisense.ai/api/...` with the `X-SentiSense-API-Key`
 * header, so the whole connector is the akta shape (sync GET + path and
 * query params). Nothing here needs a lifecycle, and every endpoint
 * inherits the provider sections below.
 *
 * BILLING. SentiSense meters in SentiSense credits, one pool, with three
 * flat per-call classes: LOOKUP 1 credit (entity search, market mood:
 * this provider default), ANALYTICS 2 credits (sentiment, rating,
 * stories, insider trades, 13F holders) and ALTERNATIVE DATA 4 credits
 * (insider cluster buys, congressional trades, options summary). The analytics and
 * alternative-data endpoints override the model with their own
 * PER_CALL amount. Source of the amounts: SentiSense, the vendor, sets
 * this card in this connector (2026-09-25); there is no public per-call
 * price page, and the $/credit is agreed with the host. The API reports
 * no per-response meter, so there is no
 * `consolidate`: the derived fold settles every run. The $/credit
 * conversion is the broker card's job. Non-2xx answers (an unknown
 * ticker, an invalid parameter, a bad key) are data and the engine
 * settles them at zero.
 *
 * INPUTS. The API ignores query params it does not know, so a misspelled
 * `lookbackDays` would silently return the default window. Every mirror is
 * therefore a strict object: an unknown key fails as INVALID_INPUT before
 * the wire instead of answering the wrong question.
 */
export default defineProvider({
    name: "sentisense",
    meta: {
        displayName: "SentiSense",
        summary:
            "US stock sentiment, ratings, insider, congressional and 13F trades, options positioning and news.",
        description: "SentiSense is US stock market data for agents: " +
            "news and social sentiment per ticker with the SentiSense " +
            "Score, a daily A to F SentiSense Rating, a market-wide fear " +
            "to greed Market Mood index, AI-clustered news stories, " +
            "insider Form 4 trades and cluster buys, congressional STOCK " +
            "Act trades, 13F institutional holders, and end-of-day options " +
            "positioning (IV rank, skew, put/call, open-interest walls, max " +
            "pain). The per-stock endpoints " +
            "all take a plain ticker, and the market-wide ones return " +
            "tickers, so the output of one call feeds the next without a " +
            "lookup step; use entity search when all you have is a " +
            "company name.",
        homepageUrl: "https://sentisense.ai",
        docsUrl: "https://sentisense.ai/docs/api",
        categories: ["stock-market-data", "stock-sentiment"],
        notes: [
            "Coverage is US-listed stocks. Tickers are case-insensitive, " +
            "and dual-class spellings resolve (BRK.B and BRK-B both work).",
            "An unknown or uncovered ticker is not always an error. " +
            "Sentiment and Rating answer 404 (`entity_not_found` with up " +
            "to three `suggestions`, or `no_coverage`), which settles at " +
            "zero. The other per-ticker endpoints answer 200 with an empty " +
            "result (the options summary with `data: null`), and every 200 " +
            "bills at its class, so resolve a name with entity search " +
            "before calling them.",
            "Several endpoints wrap their payload as `{isPreview, " +
            "previewReason, data}`. `isPreview: true` means the key's plan " +
            "returned a truncated preview; the full payload is in `data` " +
            "either way.",
            "Each successful call costs 1, 2 or 4 SentiSense credits by " +
            "class: 1 for lookups (entity search, Market Mood), 2 for " +
            "analytics (sentiment, Rating, stories, insider trades, 13F " +
            "holders), 4 for alternative data (insider cluster buys, " +
            "congressional trades, options summary).",
            "Data is informational and is not investment advice.",
        ],
    },
    auth: { inject: presets.auth.header("X-SentiSense-API-Key") },
    request: {
        baseUrl: "https://app.sentisense.ai/api",
        headers: { Accept: "application/json" },
    },
    /** Measured 2026-09-24: every ported endpoint answers in under a
     *  second (0.3 to 0.6 s wall clock), so an ordinary short budget. */
    timeouts: { requestMs: 30_000, runMs: 35_000 },
    usage: {
        /** THE credit system (design D26): one pool of SentiSense
         *  credits. This model is the LOOKUP class; the other two classes
         *  override it per endpoint. */
        credits: {
            default: {
                label: "SentiSense credits",
                description: "per successful call: 1 for lookups, 2 for " +
                    "analytics, 4 for alternative data",
            },
        },
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 1 },
        },
    },
    output: {
        /** SentiSense errors are non-2xx `{error, message, suggestions?,
         *  seeInstead?}` bodies. `suggestions` (candidate tickers for an
         *  unknown symbol) and `seeInstead` (the endpoint to call for an
         *  ETF) are lifted beside the message because they are the
         *  caller's next move. The raw body rides under `raw`. */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(data.output, "$.message");
            const code = utils.json.optionalGet(data.output, "$.error");
            const suggestions = utils.json.optionalGet(
                data.output,
                "$.suggestions",
            );
            const seeInstead = utils.json.optionalGet(
                data.output,
                "$.seeInstead",
            );
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "SentiSense API error",
                ...(typeof code === "string" ? { code } : {}),
                ...(Array.isArray(suggestions) ? { suggestions } : {}),
                ...(Array.isArray(seeInstead) ? { seeInstead } : {}),
                raw: data.output,
            };
        },
    },
});
