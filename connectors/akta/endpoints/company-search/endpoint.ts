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
    // auth + toRequest (array→CSV) inherit from the provider
    usage: {
        /** FREE (designs D25/D27) — the lookup bills nothing, and the
         *  MODEL alone says so: the quantities fns are compiler-
         *  synthesized (`{counts: {}}` is the only lawful return) and
         *  the provider consolidate handles the vendor meter (always 0
         *  here — prunes to an empty claim). */
        model: { kind: UsageModelKind.FREE },
    },
});
