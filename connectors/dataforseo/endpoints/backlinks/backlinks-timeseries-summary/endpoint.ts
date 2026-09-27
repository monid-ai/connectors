import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBacklinksTimeseriesSummaryBody } from "./schema/inputs.ts";

/**
 * Backlink Timeseries — `POST /v3/backlinks/timeseries_summary/live` (v1
 * `/backlinks/timeseries-summary`). Per-row: $0.024 per request plus
 * $0.000036 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Backlink Timeseries",
        summary:
            "Get backlink totals over time for a domain, grouped by day, " +
            "week, or month.",
        description:
            "Backlink metrics of a target across a date range: per period " +
            "the backlinks, referring domains, IPs, subnets, and rank. " +
            "Supports date_from, date_to, and group_range (day, week, " +
            "month). Suited for link-profile trend charts.",
        docsUrl:
            "https://docs.dataforseo.com/v3/backlinks/timeseries_summary/live/",
        categories: ["seo"],
    },
    endpoint: "/backlinks/timeseries-summary",
    request: { method: "POST", path: "/v3/backlinks/timeseries_summary/live" },
    input: { schema: { body: zBacklinksTimeseriesSummaryBody } },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                base_fee: {
                    kind: UsageModelKind.PER_CALL,
                    consumes: { credit: "default", amount: 0.024 },
                    label: "base fee",
                    description: "the per-request fee",
                },
                rows: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.000036 },
                    label: "rows",
                    description: "items returned (result[0].items, or its " +
                        "items_count when the items were not returned)",
                },
            },
        },
        estimate: () => ({ counts: { rows: 1 } }),
    },
});
