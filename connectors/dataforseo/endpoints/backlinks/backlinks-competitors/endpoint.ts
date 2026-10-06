import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBacklinksCompetitorsBody } from "./schema/inputs.ts";

/**
 * Backlink Competitors — `POST /v3/backlinks/competitors/live` (v1
 * `/backlinks/competitors`). Per-row: $0.024 per request plus $0.000036 per
 * row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Backlink Competitors",
        summary: "Find domains sharing referring domains with a target.",
        description:
            "Domains whose backlink profiles overlap a target's. Returns " +
            "per competitor the shared referring domain count, rank, and " +
            "total backlinks. Supports filters, sorting, and up to 1000 " +
            "rows. Suited for link-building competitor discovery. To see " +
            "which fields filters and order_by accept here, call " +
            "dataforseo#backlinks/filters (free lookup of filterable " +
            "fields per Backlinks endpoint).",
        docsUrl: "https://docs.dataforseo.com/v3/backlinks/competitors/live/",
        categories: ["seo"],
    },
    endpoint: "/backlinks/competitors",
    request: { method: "POST", path: "/v3/backlinks/competitors/live" },
    input: {
        schema: {
            body: zBacklinksCompetitorsBody.extend({
                limit: zBacklinksCompetitorsBody.shape.limit.unwrap().default(
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
