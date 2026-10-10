import { defineEndpoint } from "@shared/core";
import { zStrategyDetailQueryParams } from "./schema/inputs.ts";

/**
 * TRDEFI /api/strategy-detail — full terms of one position.
 */
export default defineEndpoint({
    meta: {
        displayName: "TRDEFI Strategy Detail",
        summary: "Full terms of one liquidity position by strategy hash — free.",
        description: "Resolve one strategy hash to the position's full " +
            "terms: pair and network, maker address and deployer, the exact " +
            "token addresses and decimals the order names, the quoted " +
            "initial position (X0/Y0), the maker's fee schedule and " +
            "protocol fee, the app and registry addresses, creation and " +
            "last-activity blocks, and the order-data size. Use after " +
            "/api/strategies to move from browsing to a specific position; " +
            "pair here is the same SYMBOL_A/SYMBOL_B used across the API.",
        docsUrl: "https://yield.trdefi.com/docs/api",
        categories: ["defi", "yields"],
    },
    request: { method: "GET", path: "/api/strategy-detail" },
    input: { schema: { queryParams: zStrategyDetailQueryParams } },
    timeouts: { requestMs: 15_000, runMs: 20_000 },
});
