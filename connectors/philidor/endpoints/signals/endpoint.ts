import { defineEndpoint } from "@shared/core";
import { zSignalsQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "DeFi News Risk Signals",
        summary:
            "Read news-derived risk signals linked to protocols, assets, and vaults.",
        description: "Read Philidor's published news-risk feed (The Wire). " +
            "Signals turn source-backed news into agent-usable risk context " +
            "with Info, Watch, RiskChange, and PolicyBreach severity. Filter " +
            "by entity, vault, category, severity, or publication time. Use " +
            "DeFi Risk Events for on-chain and operational changes, and this " +
            "endpoint for off-chain news impact.",
        docsUrl: "https://docs.philidor.io/docs/api-reference/signals",
        categories: ["defi", "crypto-signals", "news-search"],
    },
    request: { method: "GET", path: "/signals" },
    input: { schema: { queryParams: zSignalsQueryParams } },
});
