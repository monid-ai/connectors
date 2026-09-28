import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * Philidor (philidor.io) — institutional risk intelligence for DeFi vaults,
 * lending markets, real-world assets, incidents, and news signals.
 *
 * Core read endpoints are publicly accessible for evaluation, research, and
 * development. Monid uses an issued bearer key so responses are complete and
 * calls receive a stable per-key rate limit. Philidor does not meter these
 * reads in per-call credits, so the connector's vendor-usage model is FREE.
 */
export default defineProvider({
    name: "philidor",
    meta: {
        displayName: "Philidor",
        summary:
            "Risk intelligence for DeFi vaults, lending markets, RWAs, incidents, and news signals.",
        description: "Philidor gives agents structured, source-backed risk " +
            "intelligence for decentralized finance and tokenized real-world " +
            "assets. Discover and compare vaults by risk, yield, liquidity, " +
            "chain, protocol, curator, and asset; inspect a vault's complete " +
            "risk record; monitor protocol events, security incidents, and " +
            "news-derived risk signals; research institutional RWA records; " +
            "and inspect lending markets with reserve-level utilization and " +
            "rate data. Scores use Philidor's public 0–10 methodology and " +
            "responses retain their evidence and provenance fields.",
        homepageUrl: "https://philidor.io",
        docsUrl: "https://docs.philidor.io/docs/api-reference",
        categories: ["defi", "yields", "crypto-signals", "onchain-data"],
        notes: [
            "An issued Philidor bearer key provides complete records and " +
            "per-key rate limits. Core read endpoints also permit limited " +
            "anonymous evaluation access.",
            "Risk scores are on a 0–10 scale. APR and APY values are decimal " +
            "fractions, so 0.05 means 5%.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.philidor.io/v1" },
    timeouts: { requestMs: 20_000, runMs: 30_000 },
    output: {
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(
                data.output,
                "$.error.message",
            );
            const code = utils.json.optionalGet(data.output, "$.error.code");
            return {
                message: typeof message === "string"
                    ? message
                    : "Philidor API error",
                ...(typeof code === "string" ? { code } : {}),
                raw: data.output,
            };
        },
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
