import { z } from "zod";

/** Native field mirrors from https://www.refetcher.com/docs (2026-09-22), with
 * the YouTube pages/count contract deployed upstream on 2026-10-01:
 * all accounts can request up to 25 pages / 300 uploads.
 * Optionality is the vendor's. Endpoint bindings select the resource, require
 * one target, and bound profile pagination and YouTube upload limits.
 * Strict objects prevent unsupported target aliases or pagination multipliers
 * from reaching the vendor without being represented in the cost estimate.
 */
export const zPostBody = z.strictObject({
    url: z.string().min(1).optional().describe("Public post or video URL."),
    requiredFields: z.array(z.enum([
        "views",
        "plays",
        "likes",
        "reactions",
        "comments",
        "topLevelComments",
        "shares",
        "saves",
    ])).optional().describe(
        "Metrics required for success. The API defaults to views, likes, and comments; non-applicable image/carousel metrics remain null.",
    ),
    includeRecentComments: z.boolean().optional().describe(
        "Include public top-level YouTube comments or embedded TikTok comments when available.",
    ),
    recentCommentsLimit: z.number().int().min(1).max(100).optional().describe(
        "Maximum comments to request; vendor default 20.",
    ),
});

export const zProfileBody = z.strictObject({
    username: z.string().min(1).optional().describe(
        "One public profile username, not a URL.",
    ),
    platform: z.enum(["instagram", "tiktok", "facebook", "x", "twitter"])
        .optional(),
    includeRecentPosts: z.boolean().optional().describe(
        "Include recent public posts or lightweight post references; vendor default false. Set true when requesting recent-post pages.",
    ),
    pages: z.number().int().min(1).max(25).optional().describe(
        "Requested recent-post pages, from 1 to 25; vendor default 1. Set includeRecentPosts to true to request recent-post data.",
    ),
    after: z.string().min(1).max(12000).optional().describe(
        "Facebook continuation cursor from pageInfo.recentPosts.endCursor.",
    ),
    sort: z.enum(["latest", "popular"]).optional().describe(
        "X profile feed ordering; vendor default latest.",
    ),
});

export const zYouTubeChannelBody = z.strictObject({
    platform: z.literal("youtube").optional(),
    channelUrl: z.string().min(1).optional().describe(
        "YouTube channel URL or @handle.",
    ),
    type: z.enum(["channel", "channelVideos"]).optional(),
    includeRecentVideos: z.boolean().optional().describe(
        "Include lightweight upload references with channel metadata; vendor default true for type channel.",
    ),
    recentVideosLimit: z.number().int().min(1).max(300).optional().describe(
        "Maximum recent uploads, from 1 to 300. Takes precedence over pages when both are supplied. With neither input, the vendor defaults to 12.",
    ),
    pages: z.number().int().min(1).max(25).optional().describe(
        "Requested upload pages, from 1 to 25, with up to 12 videos per page. Used when recentVideosLimit is omitted; omit both inputs for the default 12 videos.",
    ),
});
