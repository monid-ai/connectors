import { defineEndpoint } from "@shared/core";
import { z } from "zod";

/**
 * TRDEFI /api/chains — the live network catalogue.
 */
export default defineEndpoint({
    meta: {
        displayName: "TRDEFI Networks",
        summary: "The networks the liquidity catalogue covers — free.",
        description: "The live chain catalogue behind TRDEFI Liquidity: " +
            "every network with open non-custodial liquidity positions, with " +
            "its chain id, native token, wrapped-native address and block " +
            "explorer. Use this to discover which networks carry liquidity " +
            "before filtering /api/strategies by chain.",
        docsUrl: "https://yield.trdefi.com/docs/api",
        categories: ["onchain-data"],
    },
    request: { method: "GET", path: "/api/chains" },
    input: { schema: { queryParams: z.object({}).strict() } },
    timeouts: { requestMs: 15_000, runMs: 20_000 },
});
