import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBacklinksDomainIntersectionBody } from "./schema/inputs.ts";

/**
 * Referring Domain Intersection — `POST
 * /v3/backlinks/domain_intersection/live` (v1
 * `/backlinks/domain-intersection`). Per-row: $0.024 per request plus
 * $0.000036 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Referring Domain Intersection",
        summary: "List domains linking to several targets at once.",
        description:
            "Referring domains shared across up to 20 targets. Returns " +
            "per domain its backlinks to each target, rank, and spam " +
            "score. Supports exclude_targets, intersection_mode, filters, " +
            "sorting, and up to 1000 rows. Suited for finding link " +
            "sources competitors have and you lack. To see which fields " +
            "filters and order_by accept here, call " +
            "dataforseo#backlinks/filters (free lookup of filterable " +
            "fields per Backlinks endpoint).",
        docsUrl:
            "https://docs.dataforseo.com/v3/backlinks/domain_intersection/live/",
        categories: ["seo"],
    },
    endpoint: "/backlinks/domain-intersection",
    request: { method: "POST", path: "/v3/backlinks/domain_intersection/live" },
    input: {
        schema: {
            body: zBacklinksDomainIntersectionBody.extend({
                limit: zBacklinksDomainIntersectionBody.shape.limit.unwrap()
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
