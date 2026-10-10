import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import { zYouTubeChannelBody } from "../../schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/youtube/channel-videos",
    meta: {
        displayName: "YouTube Channel Videos",
        summary: "Read recent YouTube uploads with video engagement metrics.",
        description:
            "Fetch recent uploads from one public YouTube channel, including available per-video views, likes, and comments. Request pages from 1 to 25 (12 videos per page), or recentVideosLimit from 1 to 300; an explicit video limit takes precedence when both are supplied. Omit both for the unchanged 12-video default. Pass a channel URL, @handle, or raw UC channel ID. Successful reads cost one unit per 12 delivered videos rounded up, with a one-unit minimum. Failed scrapes are not charged.",
        docsUrl: "https://www.refetcher.com/docs#req-youtube-channel",
        categories: ["youtube"],
    },
    request: { method: "POST", path: "/" },
    input: {
        schema: {
            body: zYouTubeChannelBody.pick({
                platform: true,
                type: true,
                channelUrl: true,
                recentVideosLimit: true,
                pages: true,
            }).extend({
                platform: z.literal("youtube").default("youtube"),
                type: z.literal("channelVideos").default("channelVideos"),
                channelUrl: zYouTubeChannelBody.shape.channelUrl.unwrap().regex(
                    /^(?:UC[A-Za-z0-9_-]{20,}|@[A-Za-z0-9._-]{3,}|https?:\/\/(?:www\.|m\.)?youtube\.com\/(?:@[A-Za-z0-9._-]+|channel\/UC[A-Za-z0-9_-]{20,}|user\/[A-Za-z0-9._-]+)\/?(?:[?#][^\s]*)?)$/,
                    "Provide one YouTube channel URL, @handle, or UC channel ID.",
                ),
                // Leave both depth inputs optional so pages is not shadowed
                // by an injected video limit. The vendor defaults to 12.
            }),
        },
    },
});
