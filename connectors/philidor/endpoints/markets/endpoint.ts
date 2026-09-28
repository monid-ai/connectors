import { defineEndpoint } from "@shared/core";
import { zMarketsQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Discover Lending Markets",
        summary:
            "Find lending markets with supplied, borrowed, reserve-count, and utilization rollups.",
        description: "Search Philidor's lending-market registry by protocol, " +
            "version, or chain. Results aggregate supplied and borrowed USD, " +
            "utilization, reserve count, liquidity topology, and protocol " +
            "metadata from the market's member reserves. Use Lending Market " +
            "Detail with the returned id to inspect every reserve and its " +
            "supply rate, borrow rate, utilization, and linked vault record.",
        docsUrl: "https://docs.philidor.io/docs/api-reference/markets",
        categories: ["defi", "yields", "onchain-data"],
    },
    request: { method: "GET", path: "/markets" },
    input: { schema: { queryParams: zMarketsQueryParams } },
});
