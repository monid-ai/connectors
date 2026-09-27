import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBacklinksAnchorsBody } from "./schema/inputs.ts";

/**
 * Backlink Anchors — `POST /v3/backlinks/anchors/live` (v1
 * `/backlinks/anchors`). Per-row: $0.024 per request plus $0.000036 per row
 * returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Backlink Anchors",
        summary: "List anchor texts pointing to a domain with counts and rank.",
        description:
            "Anchor texts of a target's backlinks. Returns per anchor the " +
            "backlink and referring-domain counts, rank, first seen date, " +
            "and dofollow share. Supports filters, sorting, and up to " +
            "1000 rows. Suited for anchor-text profile audits. To see " +
            "which fields filters and order_by accept here, call " +
            "dataforseo#backlinks/filters (free lookup of filterable " +
            "fields per Backlinks endpoint).",
        docsUrl: "https://docs.dataforseo.com/v3/backlinks/anchors/live/",
        categories: ["seo"],
    },
    endpoint: "/backlinks/anchors",
    request: { method: "POST", path: "/v3/backlinks/anchors/live" },
    input: {
        schema: {
            body: zBacklinksAnchorsBody.extend({
                limit: zBacklinksAnchorsBody.shape.limit.unwrap().default(100),
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
