import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBacklinksPageIntersectionBody } from "./schema/inputs.ts";

/**
 * Referring Page Intersection — `POST /v3/backlinks/page_intersection/live`
 * (v1 `/backlinks/page-intersection`). Per-row: $0.024 per request plus
 * $0.000036 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Referring Page Intersection",
        summary: "List pages linking to several targets at once.",
        description:
            "Referring pages shared across up to 20 targets. Returns per " +
            "page the URL, anchors, rank, and the links to each target. " +
            "Supports exclude_targets, intersection_mode, filters, " +
            "sorting, and up to 1000 rows. Suited for page-level link gap " +
            "analysis. To see which fields filters and order_by accept " +
            "here, call dataforseo#backlinks/filters (free lookup of " +
            "filterable fields per Backlinks endpoint).",
        docsUrl:
            "https://docs.dataforseo.com/v3/backlinks/page_intersection/live/",
        categories: ["seo"],
    },
    endpoint: "/backlinks/page-intersection",
    request: { method: "POST", path: "/v3/backlinks/page_intersection/live" },
    input: {
        schema: {
            body: zBacklinksPageIntersectionBody.extend({
                limit: zBacklinksPageIntersectionBody.shape.limit.unwrap()
                    .default(100),
            }),
        },
    },
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
        estimate: ({ data }) => ({ counts: { rows: data.input.body.limit } }),
    },
});
