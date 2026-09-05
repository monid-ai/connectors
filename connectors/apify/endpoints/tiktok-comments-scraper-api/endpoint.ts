import { defineEndpoint } from "@shared/core";
import { zTiktokCommentsScraperApiBody } from "./schema/inputs.ts";

/**
 * scraptik/tiktok-comments-scraper-api — List TikTok Comments. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "List TikTok Comments",
        summary: "Extract TikTok comment streams and threaded replies " +
            "from video posts.",
        description: "Extracts TikTok comment streams and threaded replies " +
            "from video posts via mobile API endpoints. Returns " +
            "comment text, timestamps, user metadata, engagement " +
            "metrics, and nested reply threads for comment-level " +
            "analysis and sentiment tracking.",
        docsUrl: "https://apify.com/scraptik/tiktok-api",
        categories: ["tiktok"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/scraptik~tiktok-comments-scraper-api/runs",
    },
    input: { schema: { body: zTiktokCommentsScraperApiBody } },
});
