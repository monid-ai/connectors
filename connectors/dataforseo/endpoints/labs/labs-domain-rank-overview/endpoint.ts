import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLabsDomainRankOverviewBody } from "./schema/inputs.ts";

/**
 * Domain Rank Overview — `POST
 * /v3/dataforseo_labs/google/domain_rank_overview/live` (v1
 * `/labs/domain-rank-overview`). Per-row: $0.012 per request plus $0.00012
 * per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Domain Rank Overview",
        summary: "Get a domain's organic and paid ranking summary in one call.",
        description: "Ranking overview of a target domain: organic and paid " +
            "keyword counts, estimated traffic and its value, position " +
            "distribution (1, 2-3, 4-10, ...), and new/lost/up/down " +
            "keyword counts. Supports location and language. Suited for a " +
            "quick domain health snapshot. To find the location_code and " +
            "language_code pairs Labs supports, call " +
            "dataforseo#labs/locations (free lookup, search by country " +
            "name).",
        docsUrl:
            "https://docs.dataforseo.com/v3/dataforseo_labs/google/domain_rank_overview/live/",
        categories: ["seo"],
    },
    endpoint: "/labs/domain-rank-overview",
    request: {
        method: "POST",
        path: "/v3/dataforseo_labs/google/domain_rank_overview/live",
    },
    input: {
        schema: {
            body: zLabsDomainRankOverviewBody.extend({
                limit: zLabsDomainRankOverviewBody.shape.limit.unwrap().default(
                    100,
                ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                base_fee: {
                    kind: UsageModelKind.PER_CALL,
                    consumes: { credit: "default", amount: 0.012 },
                    label: "base fee",
                    description: "the per-request fee",
                },
                rows: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.00012 },
                    label: "rows",
                    description: "items returned (result[0].items, or its " +
                        "items_count when the items were not returned)",
                },
            },
        },
        estimate: ({ data }) => ({ counts: { rows: data.input.body.limit } }),
    },
});
