import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBacklinksTimeseriesNewLostBody } from "./schema/inputs.ts";

/**
 * New and Lost Backlinks — `POST
 * /v3/backlinks/timeseries_new_lost_summary/live` (v1
 * `/backlinks/timeseries-new-lost`). Per-row: $0.024 per request plus
 * $0.000036 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "New and Lost Backlinks",
        summary: "Get new and lost backlinks and referring domains over time.",
        description:
            "New and lost backlinks and referring domains of a target per " +
            "period in a date range. Supports date_from, date_to, and " +
            "group_range (day, week, month). Suited for monitoring link " +
            "churn.",
        docsUrl:
            "https://docs.dataforseo.com/v3/backlinks/timeseries_new_lost_summary/live/",
        categories: ["seo"],
    },
    endpoint: "/backlinks/timeseries-new-lost",
    request: {
        method: "POST",
        path: "/v3/backlinks/timeseries_new_lost_summary/live",
    },
    input: { schema: { body: zBacklinksTimeseriesNewLostBody } },
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
