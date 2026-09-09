import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zIndustrySearchQueryParams } from "./schema/inputs.ts";

/** GET /v1/industry/search — free industry-code resolution. */
export default defineEndpoint({
    meta: {
        displayName: "Akta Industry Search",
        summary: "Resolve a free-text industry topic into codes — free.",
        description: "Resolve a free-text industry topic (e.g. 'warehouse " +
            "automation') into a ranked list of matching industry codes " +
            "from Akta's 30,000+ industry taxonomy. Each result carries " +
            "'code', 'industry_name', and a 'similarity' score (0-1, " +
            "descending). Use the returned code(s) as the 'industry' " +
            "filter on the News endpoint. Free — consumes 0 credits.",
        docsUrl:
            "https://docs.akta.pro/api-reference/supporting-apis/industry-search",
        categories: ["company-enrichment"],
    },
    request: { method: "GET", path: "/v1/industry/search/" },
    input: { schema: { queryParams: zIndustrySearchQueryParams } },
    usage: {
        /** The provider's model, restated so the estimate's counts key
         *  narrows to the doc's own literal metered key (design D23/D24 —
         *  consolidate stays provider-level). */
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.CREDIT },
        /** FREE lookup — a DEDUCED flat 0 credits per call (v1 evidence:
         *  industry-search.ts priced `makePerCallPrice(0)`; the akta docs
         *  say "Free — consumes 0 credits"). Settle trues up on
         *  `credits_consumed`. */
        estimate: () => ({ counts: { "CREDIT": 0 } }),
    },
});
