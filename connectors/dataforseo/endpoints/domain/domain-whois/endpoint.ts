import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zDomainWhoisBody } from "./schema/inputs.ts";

/**
 * Whois Domain Search — `POST /v3/domain_analytics/whois/overview/live` (v1
 * `/domain/whois`). Per-row: $0.12 per request plus $0.0012 per row returned
 * (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Whois Domain Search",
        summary:
            "Search domains by Whois data with registration dates and SEO " +
            "metrics.",
        description: "Whois records filtered by registration date, expiry, " +
            "registrar, TLD, and other fields. Returns per domain the " +
            "created, changed, and expiration dates, registrar, EPP " +
            "status, and the domain's backlink and organic metrics. " +
            "Supports filters, sorting, and up to 1000 rows. Suited for " +
            "expired-domain hunting and registration research. To see " +
            "which fields filters and order_by accept here, call " +
            "dataforseo#domain/whois-filters (free lookup of filterable " +
            "fields).",
        docsUrl:
            "https://docs.dataforseo.com/v3/domain_analytics/whois/overview/live/",
        categories: ["seo"],
    },
    endpoint: "/domain/whois",
    request: {
        method: "POST",
        path: "/v3/domain_analytics/whois/overview/live",
    },
    input: {
        schema: {
            body: zDomainWhoisBody.extend({
                limit: zDomainWhoisBody.shape.limit.unwrap().default(100),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                base_fee: {
                    kind: UsageModelKind.PER_CALL,
                    consumes: { credit: "default", amount: 0.12 },
                    label: "base fee",
                    description: "the per-request fee",
                },
                rows: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.0012 },
                    label: "rows",
                    description: "items returned (result[0].items, or its " +
                        "items_count when the items were not returned)",
                },
            },
        },
        estimate: ({ data }) => ({ counts: { rows: data.input.body.limit } }),
    },
});
