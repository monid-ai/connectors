import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zYoutubeVideoBody } from "./schema/inputs.ts";

/** POST /api/video/youtube/sync — YouTube Video Media Info. */
export default defineEndpoint({
    meta: {
        displayName: "YouTube Video Media Info",
        summary:
            "Resolve a YouTube video URL to title, author, thumbnails, duration, and download formats.",
        description:
            "Resolve one YouTube watch URL to its media metadata. Returns " +
            "the video ID, title, author and channel URL, thumbnails, " +
            "duration, a direct download URL, and the list of available " +
            "formats. Vendor runtime estimate about 90 seconds. Suited for " +
            "media pipelines, archiving, and quick video metadata lookups " +
            "without the YouTube API.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["youtube"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/youtube/video",
    request: { method: "POST", path: "/api/video/youtube/sync" },
    // the vendor lists 60 s+ latency for this scraper; v1's 330 s budget
    timeouts: { requestMs: 330_000, runMs: 330_000 },
    input: { schema: { body: zYoutubeVideoBody } },
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
