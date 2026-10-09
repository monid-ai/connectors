import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTiktokVideoBody } from "./schema/inputs.ts";

/** POST /api/sns/tiktok/video/sync — TikTok Video Details. */
export default defineEndpoint({
    meta: {
        displayName: "TikTok Video Details",
        summary:
            "Scrape a TikTok video URL into its full video, author, music, and engagement metadata.",
        description:
            "Extract the full metadata of one TikTok video from its URL. " +
            "Returns the video payload with description, author profile, " +
            "music, hashtags, play, like, share, and comment counts, and " +
            "video meta including AI description and transcription link " +
            "where available. Vendor runtime estimate about 80 seconds. " +
            "Suited for content analytics, creator research, and brand " +
            "monitoring on TikTok.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["tiktok"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/tiktok/video",
    request: { method: "POST", path: "/api/sns/tiktok/video/sync" },
    // the vendor lists 60 s+ latency for this scraper; v1's 330 s budget
    timeouts: { requestMs: 330_000, runMs: 330_000 },
    input: { schema: { body: zTiktokVideoBody } },
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
