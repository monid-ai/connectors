import { defineEndpoint } from "@shared/core";
import { zRwaQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Discover Tokenized Real-World Assets",
        summary:
            "Find tokenized treasuries, credit, equities, commodities, and T-bill-backed stablecoins.",
        description: "Search Philidor's institutional RWA universe across " +
            "tokenized treasuries, T-bill-backed stablecoins, public and " +
            "private credit, commodities, and tokenized equities. Filter by " +
            "chain, category, review status, instrument, risk tier, " +
            "regulatory wrapper, or investor-eligibility gate. Results carry " +
            "risk and review state, issuer and reviewer context, basket " +
            "membership, provenance, and institutional metadata. Use RWA " +
            "Asset Detail for version history and the attestation ledger.",
        docsUrl: "https://docs.philidor.io/docs/api-reference/rwa",
        categories: ["onchain-data", "defi", "yields", "crypto-signals"],
    },
    request: { method: "GET", path: "/rwa" },
    input: { schema: { queryParams: zRwaQueryParams } },
});
