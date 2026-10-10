import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import { zProfileBody } from "../../schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/facebook/profile",
    meta: {
        displayName: "Facebook Profile",
        summary:
            "Read public Facebook profile metadata and optional recent post links.",
        description:
            "Fetch one Facebook profile or page by username. Set includeRecentPosts to true to request 1–25 pages of available public post links, with up to 3 links per page. Pages default to 1 and includeRecentPosts defaults to false. Pass the returned pageInfo.recentPosts.endCursor as after to continue in another call. Inspect limitations and pageInfo.recentPosts.incomplete before treating the requested window as complete. Post references omit engagement metrics. Failed scrapes are not charged.",
        docsUrl: "https://www.refetcher.com/docs#req-facebook-profile",
        categories: ["facebook"],
    },
    request: { method: "POST", path: "/" },
    input: {
        schema: {
            body: zProfileBody.pick({
                platform: true,
                username: true,
                includeRecentPosts: true,
                pages: true,
                after: true,
            }).extend({
                platform: z.literal("facebook").default("facebook"),
                username: zProfileBody.shape.username.unwrap().regex(
                    /^@?[A-Za-z0-9.-]{1,100}$/,
                    "Provide one Facebook Profile username, not a URL or a list.",
                ),
                // Keep the native default within the shared 1–25-page bound.
                pages: zProfileBody.shape.pages.unwrap().default(1),
            }),
        },
    },
});
