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
        /** FREE (designs D25/D27) — the lookup bills nothing, and the
         *  MODEL alone says so: the quantities fns are compiler-
         *  synthesized (`{counts: {}}` is the only lawful return) and
         *  the provider consolidate handles the vendor meter (always 0
         *  here — prunes to an empty claim). */
        model: { kind: UsageModelKind.FREE },
    },
});
