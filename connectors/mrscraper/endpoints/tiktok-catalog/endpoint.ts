import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTiktokCatalogBody } from "./schema/inputs.ts";

/** POST /api/tiktok/web/catalog/sync — TikTok Shop Category Page. */
export default defineEndpoint({
    meta: {
        displayName: "TikTok Shop Category Page",
        summary:
            "Scrape a TikTok Shop category page into its loader data and page metadata.",
        description:
            "Extract the category page payload from a TikTok Shop category " +
            "URL. Returns the page loader data with category ID and name, " +
            "routing metadata, region and environment info, WAF and bot- " +
            "detection decisions, and A/B configuration, plus any errors. " +
            "Suited for TikTok Shop category structure tracking and page- " +
            "level analysis.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["tiktok-shop"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/tiktok/catalog",
    request: { method: "POST", path: "/api/tiktok/web/catalog/sync" },
    input: { schema: { body: zTiktokCatalogBody } },
    usage: {
        /** 36 tokens per run — the vendor's marketplace card via v1
         *  (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 36 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
