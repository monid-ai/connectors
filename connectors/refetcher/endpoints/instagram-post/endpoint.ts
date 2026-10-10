import { defineEndpoint } from "@shared/core";
import { zPostBody } from "../../schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/instagram/post",
    meta: {
        displayName: "Instagram Post",
        summary:
            "Read public Instagram post or Reel details and engagement metrics.",
        description:
            "Fetch one public Instagram post or Reel. Returns caption, author, applicable engagement metrics, and available media. Instagram image and carousel views can be null with metricAvailability.views set to not_applicable. Failed scrapes are not charged.",
        docsUrl: "https://www.refetcher.com/docs#req-instagram-post",
        categories: ["instagram"],
    },
    request: { method: "POST", path: "/" },
    input: {
        schema: {
            body: zPostBody.pick({
                url: true,
                requiredFields: true,
            }).extend({
                // A single post URL keeps the operation within one billable unit.
                url: zPostBody.shape.url.unwrap().regex(
                    /^https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|reels|tv)\/[A-Za-z0-9_-]+\/?(?:[?#][^\s]*)?$/,
                    "Use a supported Instagram Post URL for one public target.",
                ),
            }),
        },
    },
});
