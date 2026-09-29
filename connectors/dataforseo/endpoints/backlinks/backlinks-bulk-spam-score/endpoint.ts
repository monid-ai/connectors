import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBacklinksBulkSpamScoreBody } from "./schema/inputs.ts";

/**
 * Bulk Spam Scores — `POST /v3/backlinks/bulk_spam_score/live` (v1
 * `/backlinks/bulk-spam-score`). Per-row: $0.024 per request plus $0.000036
 * per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Bulk Spam Scores",
        summary: "Get spam scores for up to 1000 domains or pages.",
        description:
            "Spam score (0-100) for a list of domains, subdomains, or " +
            "pages. Returns per target its spam score. Suited for " +
            "filtering link prospects and disavow candidates.",
        docsUrl:
            "https://docs.dataforseo.com/v3/backlinks/bulk_spam_score/live/",
        categories: ["seo"],
    },
    endpoint: "/backlinks/bulk-spam-score",
    request: { method: "POST", path: "/v3/backlinks/bulk_spam_score/live" },
    input: { schema: { body: zBacklinksBulkSpamScoreBody } },
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
        estimate: ({ data }) => ({
            counts: { rows: data.input.body.targets.length },
        }),
    },
});
