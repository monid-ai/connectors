import { defineEndpoint } from "@shared/core";
import { zFacebookProfilePostsScraperBody } from "./schema/inputs.ts";

/**
 * cleansyntax/facebook-profile-posts-scraper — Pull Facebook Profile Posts. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Pull Facebook Profile Posts",
        summary: "Collect public Facebook profile posts, profile details, " +
            "or a profile ID, by profile URL or ID.",
        description: "Fetches public Facebook profile data through one actor " +
            "with a selectable mode: recent profile posts by URL or " +
            "by profile ID, keyword post search, profile details by " +
            "ID or URL, and profile ID resolution from a URL. Post " +
            "records return post ID, type, permalink, message text, " +
            "timestamp, comment/reaction/reshare counts, a per-type " +
            "reaction breakdown, author metadata, and media assets " +
            "(image, video, video files, video thumbnail, album " +
            "preview, external link). Detail records return the " +
            "profile metadata payload, and the ID lookup returns the " +
            "resolved profile ID. Targets are supplied one per line " +
            "and optional start/end dates narrow the post range.",
        docsUrl: "https://apify.com/cleansyntax/facebook-profile-posts-scraper",
        categories: [],
    },
    request: {
        method: "POST",
        path: "/v2/acts/cleansyntax~facebook-profile-posts-scraper/runs",
    },
    input: { schema: { body: zFacebookProfilePostsScraperBody } },
});
