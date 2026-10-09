import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTiktokHashtagBody } from "./schema/inputs.ts";

/** POST /api/tiktok/tags/sync — TikTok Hashtag Stats. */
export default defineEndpoint({
    meta: {
        displayName: "TikTok Hashtag Stats",
        summary: "Look up a TikTok hashtag's summary stats and its top videos.",
        description:
            "Fetch a TikTok hashtag by name. Returns the hashtag summary " +
            "(view and video counts) and the top videos under it with their " +
            "metadata. Suited for trend tracking, hashtag research, and " +
            "influencer discovery.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["tiktok"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/tiktok/hashtag",
    request: { method: "POST", path: "/api/tiktok/tags/sync" },
    input: { schema: { body: zTiktokHashtagBody } },
    usage: {
        /** 10 tokens per run — the vendor's marketplace card via v1's
         *  2026-09-08 drill (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 10 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
