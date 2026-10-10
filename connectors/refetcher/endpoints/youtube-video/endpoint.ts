import { defineEndpoint } from "@shared/core";
import { zPostBody } from "../../schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/youtube/video",
    meta: {
        displayName: "YouTube Video",
        summary: "Read YouTube video or Short details and engagement metrics.",
        description:
            "Fetch one public YouTube video or Short. Supports watch, Shorts, embed, live, and youtu.be URLs. Returns available engagement metrics and stable thumbnail/embed links; optionally includes recent public top-level comments. Failed scrapes are not charged.",
        docsUrl: "https://www.refetcher.com/docs#req-youtube-video",
        categories: ["youtube"],
    },
    request: { method: "POST", path: "/" },
    input: {
        schema: {
            body: zPostBody.pick({
                url: true,
                requiredFields: true,
                includeRecentComments: true,
                recentCommentsLimit: true,
            }).extend({
                // A single post URL keeps the operation within one billable unit.
                url: zPostBody.shape.url.unwrap().regex(
                    /^https?:\/\/(?:(?:www|m)\.)?(?:youtube\.com\/(?:watch\?(?:[^#\s]*&)?v=[A-Za-z0-9_-]{11}(?:[&#][^\s]*)?|(?:shorts|embed|live)\/[A-Za-z0-9_-]{11}\/?(?:[?#][^\s]*)?)|youtu\.be\/[A-Za-z0-9_-]{11}\/?(?:[?#][^\s]*)?)$/,
                    "Use a supported YouTube Video URL for one public target.",
                ),
            }),
        },
    },
});
