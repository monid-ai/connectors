import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
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
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/scraptik/tiktok-comments-scraper-api",
    request: {
        method: "POST",
        path: "/v2/acts/scraptik~tiktok-comments-scraper-api/runs",
    },
    input: { schema: { body: zTiktokCommentsScraperApiBody } },
    /** TWO flat charge events (survey: `apify-actor-start` + `request`) —
     *  keyed components make both representable instead of collapsing them
     *  into one PER_CALL (design D19; the old ≤1-PER_CALL constraint is
     *  gone). Still nothing to count: no estimate fn (the engine default
     *  `{counts: {}}` is already exact) and the settle reports no counts —
     *  both flat components bill off the model + success. */
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                "apify-actor-start": {
                    kind: UsageModelKind.PER_CALL,
                    description: "run start fee",
                },
                "request": {
                    kind: UsageModelKind.PER_CALL,
                    description: "per-run request fee",
                },
            },
        },
    },
});
