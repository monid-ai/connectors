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
        /** FREE (design D25) — the lookup bills nothing: v1 evidence
         *  company-search.ts priced `makePerCallPrice(0)`. Free-ness is
         *  a MODEL fact — the fns return plain {counts: {}} and the
         *  model interprets: a billing SHAPE, not "0 credits". */
        model: { kind: UsageModelKind.FREE },
        estimate: () => ({ counts: {} }),
        consolidate: ({ data, utils }) => ({
            usage: { counts: {} },
            // still absorb the vendor's billing field (always 0 here) —
            // billing facts never ride the payload
            output: utils.json.omit(data.output, ["credits_consumed"]),
        }),
    },
});
