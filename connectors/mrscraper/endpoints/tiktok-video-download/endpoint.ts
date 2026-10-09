import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTiktokVideoDownloadBody } from "./schema/inputs.ts";

/** POST /api/video/tiktok/sync — TikTok Video Download Link. */
export default defineEndpoint({
    meta: {
        displayName: "TikTok Video Download Link",
        summary:
            "Resolve a TikTok video URL to a direct download link with caption and music.",
        description:
            "Resolve one TikTok video URL to its media. Returns the video " +
            "ID, direct download URL, width and height, thumbnail URL, " +
            "duration, caption, music URL, and music metadata. Cheaper and " +
            "faster than the full video-details scraper; no engagement " +
            "counts. Suited for archiving clips, media pipelines, and " +
            "caption or audio extraction.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["tiktok"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/tiktok/video-download",
    request: { method: "POST", path: "/api/video/tiktok/sync" },
    input: { schema: { body: zTiktokVideoDownloadBody } },
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
