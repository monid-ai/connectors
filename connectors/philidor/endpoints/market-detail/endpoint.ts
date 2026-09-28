import { defineEndpoint } from "@shared/core";
import { zMarketDetailPathParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Lending Market Detail",
        summary:
            "Inspect a lending market and every reserve's supply, borrow, rate, and utilization data.",
        description: "Return one lending market with its aggregate supplied, " +
            "borrowed, utilization, liquidity-hub, and protocol metadata, " +
            "plus every active reserve. Each reserve includes supplied and " +
            "borrowed USD, supply and borrow APR, utilization, asset identity, " +
            "and the id of its linked Philidor vault record. APR values are " +
            "decimal fractions. Use Discover Lending Markets first when the " +
            "market id is not known.",
        docsUrl: "https://docs.philidor.io/docs/api-reference/markets",
        categories: ["defi", "yields", "onchain-data"],
    },
    endpoint: "/markets/{id}",
    request: { method: "GET", path: "/markets/{id}" },
    input: { schema: { pathParams: zMarketDetailPathParams } },
});
