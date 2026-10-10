import { defineEndpoint } from "@shared/core";
import { zPostBody } from "../../schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/x/post",
    meta: {
        displayName: "X Post",
        summary: "Read public X (Twitter) post content and engagement metrics.",
        description:
            "Fetch one public X (Twitter) post from an x.com or twitter.com status URL. Returns post content, author information, available engagement metrics, and media. Failed scrapes are not charged.",
        docsUrl: "https://www.refetcher.com/docs#req-x-post",
        categories: ["twitter"],
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
                    /^https?:\/\/(?:(?:www|mobile)\.)?(?:x|twitter)\.com\/(?:[A-Za-z0-9_]+\/status|i\/web\/status)\/[0-9]{8,25}(?:\/(?:photo|video)\/[0-9]+)?\/?(?:[?#][^\s]*)?$/,
                    "Use a supported X Post URL for one public target.",
                ),
            }),
        },
    },
});
