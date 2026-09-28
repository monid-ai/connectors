import { defineEndpoint } from "@shared/core";
import { zVaultsQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Discover DeFi Vaults",
        summary:
            "Find and compare DeFi vaults by risk, yield, liquidity, protocol, chain, and asset.",
        description:
            "Search Philidor's cross-chain vault registry and compare " +
            "risk score and tier, TVL, net APR, utilization, available " +
            "liquidity, yield quality, protocol, curator, and asset metadata. " +
            "Use filters to narrow the universe or sort it for screening. " +
            "This is the discovery endpoint; use Philidor Vault Detail with " +
            "the returned network and address for the full risk record.",
        docsUrl: "https://docs.philidor.io/docs/api-reference/vaults",
        categories: ["defi", "yields", "crypto-signals"],
    },
    request: { method: "GET", path: "/vaults" },
    input: { schema: { queryParams: zVaultsQueryParams } },
});
