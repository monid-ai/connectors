import { defineEndpoint } from "@shared/core";
import { zPostBody } from "../../schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/tiktok/video",
    meta: {
        displayName: "TikTok Video",
        summary:
            "Read public TikTok video details, engagement, and available media.",
        description:
            "Fetch one public TikTok video using its canonical tiktok.com/@creator/video/id URL. Returns available engagement metrics and media links. Optional recent comments are limited to embedded public comments and may be empty. Redirect-only short links are not accepted. Failed scrapes are not charged.",
        docsUrl: "https://www.refetcher.com/docs#req-tiktok-video",
        categories: ["tiktok"],
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
                    /^https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9._-]+\/video\/[0-9]+\/?(?:[?#][^\s]*)?$/,
                    "Use a supported TikTok Video URL for one public target.",
                ),
            }),
        },
    },
});
