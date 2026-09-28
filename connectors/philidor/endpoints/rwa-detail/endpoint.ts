import { defineEndpoint } from "@shared/core";
import { zRwaDetailPathParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Tokenized RWA Asset Detail",
        summary:
            "Inspect an RWA asset's risk, issuer, structure, provenance, versions, and attestations.",
        description: "Return the full institutional record for one tokenized " +
            "real-world asset: current approved version, issuer, Philidor " +
            "risk dimensions, legal and regulatory structure, custody, " +
            "liquidity and redemption terms, yield basis, basket membership, " +
            "discovery provenance, recent version history, and signed " +
            "attestation ledger. Anonymous access may withhold some detailed " +
            "dimensions; an issued bearer key returns the entitled record.",
        docsUrl: "https://docs.philidor.io/docs/api-reference/rwa",
        categories: ["onchain-data", "defi", "yields", "crypto-signals"],
    },
    endpoint: "/rwa/{asset_id}",
    request: { method: "GET", path: "/rwa/{asset_id}" },
    input: { schema: { pathParams: zRwaDetailPathParams } },
});
