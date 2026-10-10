import { defineEndpoint } from "@shared/core";
import { zStrategiesQueryParams } from "./schema/inputs.ts";

/**
 * TRDEFI /api/strategies — enumerate open liquidity positions.
 */
export default defineEndpoint({
    meta: {
        displayName: "TRDEFI Strategies",
        summary: "List the open non-custodial liquidity positions — free.",
        description: "The open liquidity catalogue as a list: each row is " +
            "one maker position quoting on-chain, with its pair and network, " +
            "its maker's quoted rates, depth and spread, and the token " +
            "addresses and fee schedule the order commits to. Filter by " +
            "chain, by pair (SYMBOL_A/SYMBOL_B) or free-text over pair, " +
            "chain and hash; page with limit (1–500). Default source " +
            "'catalogue' reads the normalised roll-up; 'source=scan' forces " +
            "a slower fresh chain scan. Returns maker quotes to browse; " +
            "pass a row's hash to /api/quote for a simulated fill against " +
            "it, or /api/strategy-detail for its full terms.",
        docsUrl: "https://yield.trdefi.com/docs/api",
        categories: ["defi", "yields", "onchain-data"],
        notes: [
            "Rows are sorted by maker quoted volume (USDC-equivalent) " +
                "descending where the catalogue carries it.",
            "'source=scan' takes around 10 seconds and returns empty " +
                "strategies plus an error field for chains whose scan failed.",
        ],
    },
    request: { method: "GET", path: "/api/strategies" },
    input: { schema: { queryParams: zStrategiesQueryParams } },
    timeouts: { requestMs: 15_000, runMs: 30_000 },
});
