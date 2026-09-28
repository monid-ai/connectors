import { defineEndpoint } from "@shared/core";
import { zEntitySearchQueryParams } from "./schema/inputs.ts";

/** `GET /v1/kb/entities/search`: resolve a name to a ticker or entity. */
export default defineEndpoint({
    meta: {
        displayName: "SentiSense Entity Search",
        summary:
            "Resolve a company name to its US ticker, or look up people, products and topics.",
        description: "Look up companies, ETFs, people, products, " +
            "organizations, countries and topics by name, best match " +
            "first. Use it to turn a company name into the ticker the " +
            "per-ticker endpoints take. Only a match with a non-null " +
            "`ticker` can feed them: people, products and topics resolve " +
            "with `ticker: null`, and so does a company whose " +
            "`listingCoverage` is `public_untracked` (listed on a market " +
            "not priced here; `listing` names it, e.g. `KRX: 005930`) or " +
            "`private` (not listed). `public_tracked` companies carry the " +
            "US ticker to use.",
        docsUrl: "https://sentisense.ai/docs/api/entities",
        categories: ["stock-market-data"],
    },
    request: { method: "GET", path: "/v1/kb/entities/search" },
    input: { schema: { queryParams: zEntitySearchQueryParams } },
});
