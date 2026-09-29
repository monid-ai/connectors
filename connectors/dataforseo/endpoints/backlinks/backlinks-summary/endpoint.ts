import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBacklinksSummaryBody } from "./schema/inputs.ts";

/**
 * Backlink Summary — `POST /v3/backlinks/summary/live` (v1
 * `/backlinks/summary`). Per-row: $0.024 per request plus $0.000036 per row
 * returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Backlink Summary",
        summary: "Get a domain or page's backlink profile summary: links, " +
            "domains, rank, spam.",
        description:
            "Backlink profile summary for a target domain, subdomain, or " +
            "page. Returns total backlinks and referring domains, " +
            "referring main domains, IPs and subnets, rank, spam score, " +
            "broken links, dofollow vs nofollow counts, and breakdowns by " +
            "TLD, country, anchor type, platform, and link attribute. " +
            "Supports include_subdomains and backlinks_filters. Suited " +
            "for a one-call link audit. To see which fields " +
            "backlinks_filters accepts here, call " +
            "dataforseo#backlinks/filters (free lookup of filterable " +
            "fields per Backlinks endpoint).",
        docsUrl: "https://docs.dataforseo.com/v3/backlinks/summary/live/",
        categories: ["seo"],
    },
    endpoint: "/backlinks/summary",
    request: { method: "POST", path: "/v3/backlinks/summary/live" },
    input: { schema: { body: zBacklinksSummaryBody } },
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
