import { defineEndpoint } from "@shared/core";
import { zPostBody } from "../../schema/inputs.ts";

export default defineEndpoint({
    endpoint: "/facebook/post",
    meta: {
        displayName: "Facebook Post",
        summary: "Read public Facebook post, photo, video, or Reel metrics.",
        description:
            "Fetch one public Facebook post, photo, video, or Reel. Supports canonical post and video URLs, fb.watch, shared post links, and Facebook permalink/photo/story URLs. Non-video posts may have no applicable views metric. Failed scrapes are not charged.",
        docsUrl: "https://www.refetcher.com/docs#req-facebook-post",
        categories: ["facebook"],
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
                    /^https?:\/\/(?:(?:(?:www|m|web)\.)?facebook\.com\/(?:(?:reel\/[0-9]+|[A-Za-z0-9.-]+\/(?:posts\/[A-Za-z0-9]+|videos\/(?:[A-Za-z0-9_-]+\/)*[0-9]+)|share\/p\/[A-Za-z0-9._-]+)\/?(?:[?#][^\s]*)?|(?:watch\/?|video\.php)\?(?:[^#\s]*&)?v=[0-9]+(?:[&#][^\s]*)?|(?:permalink|photo|story)\.php\?(?:[^#\s]*&)?(?:story_fbid|fbid)=[0-9]+(?:[&#][^\s]*)?)|fb\.watch\/[A-Za-z0-9_-]+\/?(?:[?#][^\s]*)?)$/,
                    "Use a supported Facebook Post URL for one public target.",
                ),
            }),
        },
    },
});
