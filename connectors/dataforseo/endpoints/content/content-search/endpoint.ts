import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zContentSearchBody } from "./schema/inputs.ts";

/**
 * Search Web Mentions — `POST /v3/content_analysis/search/live` (v1
 * `/content/search`). Per-row: $0.024 per request plus $0.000036 per row
 * returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Web Mentions",
        summary:
            "Find web pages citing a keyword or brand, with sentiment and " +
            "page metrics.",
        description: "Citations of a keyword across DataForSEO's web content " +
            "index. Returns per page the URL, domain, title, snippet with " +
            "the match, publish date, language, country, page category, " +
            "sentiment connotations, and domain rank. Supports page_type, " +
            "search_mode, filters, sorting, and up to 1000 rows. Suited " +
            "for brand monitoring and mention discovery. To see which " +
            "fields filters and order_by accept here, call " +
            "dataforseo#content/filters (free lookup of filterable " +
            "fields).",
        docsUrl: "https://docs.dataforseo.com/v3/content_analysis/search/live/",
        categories: ["news-search"],
    },
    endpoint: "/content/search",
    request: { method: "POST", path: "/v3/content_analysis/search/live" },
    input: {
        schema: {
            body: zContentSearchBody.extend({
                limit: zContentSearchBody.shape.limit.unwrap().default(20),
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
