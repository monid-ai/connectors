import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zYoutubeCommentsBody } from "./schema/inputs.ts";

/** POST /api/youtube/comments/sync — YouTube Video Comments. */
export default defineEndpoint({
    meta: {
        displayName: "YouTube Video Comments",
        summary:
            "Scrape the comments of a YouTube video by video ID, including replies.",
        description:
            "Fetch comments for one YouTube video ID. Returns the video ID, " +
            "the list of comments and replies with author, text, likes, and " +
            "timestamps, and pagination statistics for the scrape. Vendor " +
            "runtime estimate about 2 minutes. Suited for audience " +
            "sentiment analysis, community research, and comment mining.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["youtube"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/youtube/comments",
    request: { method: "POST", path: "/api/youtube/comments/sync" },
    // the vendor lists 60 s+ latency for this scraper; v1's 330 s budget
    timeouts: { requestMs: 330_000, runMs: 330_000 },
    input: { schema: { body: zYoutubeCommentsBody } },
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
