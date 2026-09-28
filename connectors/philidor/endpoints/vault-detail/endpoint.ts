import { defineEndpoint } from "@shared/core";
import {
    zVaultDetailPathParams,
    zVaultDetailQueryParams,
} from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "DeFi Vault Risk Detail",
        summary:
            "Inspect a vault's complete risk, yield, liquidity, audit, and strategy record.",
        description: "Look up one vault by network and contract address. The " +
            "response combines Philidor's 0–10 risk score and tier with risk " +
            "vectors, evidence, TVL, yield and reward APR, liquidity, " +
            "utilization, audit history, declared strategy, mandate " +
            "conformance, depositability, and recent snapshots. APR values " +
            "are decimal fractions. Use Discover DeFi Vaults first when the " +
            "network or address is not known.",
        docsUrl: "https://docs.philidor.io/docs/api-reference/vault-detail",
        categories: ["defi", "yields", "crypto-signals"],
    },
    endpoint: "/vault/{network}/{address}",
    request: { method: "GET", path: "/vault/{network}/{address}" },
    input: {
        schema: {
            pathParams: zVaultDetailPathParams,
            queryParams: zVaultDetailQueryParams,
        },
    },
});
