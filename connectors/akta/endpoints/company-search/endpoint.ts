import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCompanySearchQueryParams } from "./schema/inputs.ts";

/** GET /v1/company/search — free lookup step for the other Akta endpoints. */
export default defineEndpoint({
    meta: {
        displayName: "Akta Company Search",
        summary: "Locate a company by name or website to get its uuid.",
        description: "Locate a company by name or website and get its core " +
            "identity fields (uuid, name, website, product_category, " +
            "company_status). The backend auto-detects the input type. This " +
            "is the lookup step for the rest of the Akta endpoints: the " +
            "news, enrichment, employee-reviews, and product-reviews " +
            "endpoints take a 'company' that is a website or uuid — not a " +
            "bare name — so resolve the name here first and pass the " +
            "returned uuid (or website) along.",
        docsUrl:
            "https://docs.akta.pro/api-reference/supporting-apis/company-search",
        categories: ["company-enrichment"],
    },
    request: { method: "GET", path: "/v1/company/search/" },
    input: { schema: { queryParams: zCompanySearchQueryParams } },
    // auth, toRequest (array→CSV), and usage model/consolidate (credits)
    // inherit from the provider
    usage: {
        /** The provider's model, restated so the estimate's counts key
         *  narrows to the doc's own literal metered key (design D23/D24 —
         *  consolidate stays provider-level). */
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.CREDIT },
        /** FREE lookup — a DEDUCED flat 0 credits per call (v1 evidence:
         *  company-search.ts priced `makePerCallPrice(0)`). Settle trues
         *  up on `credits_consumed`. */
        estimate: () => ({ counts: { "CREDIT": 0 } }),
    },
});
