import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBacklinksHistoryBody } from "./schema/inputs.ts";

/**
 * Backlink History — `POST /v3/backlinks/history/live` (v1
 * `/backlinks/history`). Per-row: $0.024 per request plus $0.000036 per row
 * returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Backlink History",
        summary: "Get a domain's monthly backlink and referring-domain " +
            "history.",
        description:
            "Month-by-month backlink history for a target domain: new and " +
            "lost backlinks, referring domains, rank, and totals per " +
            "month. Supports date_from and date_to. Suited for " +
            "link-growth charts.",
        docsUrl: "https://docs.dataforseo.com/v3/backlinks/history/live/",
        categories: ["seo"],
    },
    endpoint: "/backlinks/history",
    request: { method: "POST", path: "/v3/backlinks/history/live" },
    input: { schema: { body: zBacklinksHistoryBody } },
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
