import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zDiscoverPeopleBody } from "./schema/inputs.ts";

/** POST /discover/people — reachable-people totals for a company filter. */
export default defineEndpoint({
    meta: {
        displayName: "Count Reachable People",
        summary:
            "Estimate how many people are reachable across every company matching your filters.",
        description: "Free people-angle view of company discovery: the " +
            "same filters and company rows as /discover, plus " +
            "meta.total_emails — the aggregate personal/generic/total " +
            "email counts across EVERY matching company, not just the " +
            "current page. Returns up to 100 companies per page, each " +
            "with domain, name, and per-company email counts. Suited for " +
            "sizing a campaign's total reachable audience before spending " +
            "on per-domain searches. To pull the emails for one of these " +
            "companies, pass its domain to /domain-search.",
        docsUrl: "https://hunter.io/api-documentation/v2#discover-people",
        categories: ["company-enrichment"],
        notes: [
            "Upstream marks this endpoint Beta; the response shape may " +
            "change.",
            "The natural-language query leg is not carried here — use " +
            "/discover-ai once and replay its meta.filters.",
        ],
    },
    // a POST with the JSON body v1 drill-verified (the documented GET
    // bracket encoding cannot carry the nested filters — design D5)
    request: { method: "POST", path: "/discover/people" },
    input: {
        schema: {
            body: z.union([
                zDiscoverPeopleBody.required({ organization: true }),
                zDiscoverPeopleBody.required({ similar_to: true }),
                zDiscoverPeopleBody.required({ headquarters_location: true }),
                zDiscoverPeopleBody.required({ industry: true }),
                zDiscoverPeopleBody.required({ headcount: true }),
                zDiscoverPeopleBody.required({ company_type: true }),
                zDiscoverPeopleBody.required({ year_founded: true }),
                zDiscoverPeopleBody.required({ keywords: true }),
                zDiscoverPeopleBody.required({ technology: true }),
                zDiscoverPeopleBody.required({ funding: true }),
            ]).describe(
                "Provide at least one filter — the same filter set as " +
                    "/discover.",
            ),
        },
    },
    /** Free — v1's drill measured 0 credits. */
    usage: { model: { kind: UsageModelKind.FREE } },
});
