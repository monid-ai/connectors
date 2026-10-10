import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import { zProfileBody } from "../../schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/instagram/profile",
    meta: {
        displayName: "Instagram Profile",
        summary:
            "Read public Instagram profile metadata and optional recent media links.",
        description:
            "Fetch one Instagram profile by username. Set includeRecentPosts to true to request 1–25 pages of available public media references, with up to 12 references per page. Pages default to 1 and includeRecentPosts defaults to false. References may include publicly exposed counts; use Instagram Post for full per-post metrics. Returned pages depend on public data availability. Failed scrapes are not charged.",
        docsUrl: "https://www.refetcher.com/docs#req-instagram-profile",
        categories: ["instagram"],
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
                platform: z.literal("instagram").default("instagram"),
                username: zProfileBody.shape.username.unwrap().regex(
                    /^@?[A-Za-z0-9._]{1,30}$/,
                    "Provide one Instagram Profile username, not a URL or a list.",
                ),
                // Keep the native default within the shared 1–25-page bound.
                pages: zProfileBody.shape.pages.unwrap().default(1),
            }),
        },
    },
});
