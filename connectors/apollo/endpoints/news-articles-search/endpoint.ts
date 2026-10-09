import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zNewsArticlesSearchQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Apollo News Articles Search",
        summary:
            "Search news about companies by organization, category, and date.",
        description: "Find news coverage tied to companies in Apollo's " +
            "database — funding rounds, leadership changes, hiring pushes, " +
            "product launches, and other trigger events — filtered by " +
            "Apollo organization id (from Organization Search), category, " +
            "and publish date. Best for account monitoring, trigger-event " +
            "prospecting, and market intelligence.",
        docsUrl: "https://docs.apollo.io/reference/news-articles-search",
        categories: ["company-news", "company-enrichment"],
        notes: ["published_at[min] must not fall after published_at[max]."],
    },
    request: { method: "POST", path: "/news_articles/search" },
    input: { schema: { queryParams: zNewsArticlesSearchQueryParams } },
    usage: {
        /** 1 credit per page — https://docs.apollo.io/docs/api-pricing
         *  (2026-09-16). One request IS one page; a page with no article
         *  draws nothing (design D4). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.PAGE,
            label: "pages",
            description: "search pages that returned at least one article",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: () => ({ counts: { PAGE: 1 } }),
        evidence: ({ data, utils }) => ({
            counts: {
                PAGE: (utils.json.optionalLen(data.output, "$.news_articles") ??
                        0) > 0
                    ? 1
                    : 0,
            },
        }),
    },
});
