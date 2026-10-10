import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import { zProfileBody } from "../../schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/x/profile",
    meta: {
        displayName: "X Profile",
        summary:
            "Read public X (Twitter) profile metadata and optional public posts.",
        description:
            "Fetch one X (Twitter) profile by username. Set includeRecentPosts to true to request 1–25 pages of available public posts, with up to 5 posts per page, ordered by latest or popular. Pages default to 1 and includeRecentPosts defaults to false. Returned posts include the per-post fields exposed by the source; authored replies are excluded. Returned pages depend on public data availability. Failed scrapes are not charged.",
        docsUrl: "https://www.refetcher.com/docs#req-x-profile",
        categories: ["twitter"],
    },
    request: { method: "POST", path: "/" },
    input: {
        schema: {
            body: zProfileBody.pick({
                platform: true,
                username: true,
                includeRecentPosts: true,
                pages: true,
                sort: true,
            }).extend({
                platform: z.literal("x").default("x"),
                username: zProfileBody.shape.username.unwrap().regex(
                    /^@?[A-Za-z0-9_]{1,15}$/,
                    "Provide one X Profile username, not a URL or a list.",
                ),
                // Keep the native default within the shared 1–25-page bound.
                pages: zProfileBody.shape.pages.unwrap().default(1),
            }),
        },
    },
});
