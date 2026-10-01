import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import { zProfileBody } from "../../schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/tiktok/profile",
    meta: {
        displayName: "TikTok Profile",
        summary:
            "Read public TikTok profile metadata and optional recent posts.",
        description:
            "Fetch one TikTok profile by username. Set includeRecentPosts to true to request 1–25 pages of available public posts, with up to 12 posts per page. Pages default to 1 and includeRecentPosts defaults to false. Returned posts can include available engagement metrics, rich media, and image slideshows. Returned pages depend on public data availability. Failed scrapes are not charged.",
        docsUrl: "https://www.refetcher.com/docs#req-tiktok-profile",
        categories: ["tiktok"],
    },
    request: { method: "POST", path: "/" },
    input: {
        schema: {
            body: zProfileBody.pick({
                platform: true,
                username: true,
                includeRecentPosts: true,
                pages: true,
            }).extend({
                platform: z.literal("tiktok").default("tiktok"),
                username: zProfileBody.shape.username.unwrap().regex(
                    /^@?[A-Za-z0-9._-]{1,64}$/,
                    "Provide one TikTok Profile username, not a URL or a list.",
                ),
                // Keep the native default within the shared 1–25-page bound.
                pages: zProfileBody.shape.pages.unwrap().default(1),
            }),
        },
    },
});
