import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTiktokApiBody } from "./schema/inputs.ts";

/**
 * scraptik/tiktok-api — TikTok API. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "TikTok API",
        summary: "Access TikTok mobile API data: users, videos, sounds, " +
            "search, comments, followers, and hashtags.",
        description: "Extracts TikTok data via mobile API endpoints across " +
            "users, videos, sounds, search, comments, followers, and " +
            "hashtags. Returns profile data and statistics, " +
            "follower/following lists, video metadata with " +
            "engagement metrics, watermark-free download URLs, " +
            "comment threads and replies, music/track metadata, and " +
            "hashtag trend data. Supports search across users, " +
            "posts, sounds, hashtags, and lives.",
        docsUrl: "https://apify.com/scraptik/tiktok-api",
        categories: ["tiktok"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/scraptik/tiktok-api",
    request: {
        method: "POST",
        path: "/v2/acts/scraptik~tiktok-api/runs",
    },
    input: { schema: { body: zTiktokApiBody } },
    /** Flat per-run pricing (survey: the `request` charge event) — the
     *  run is the product. The estimate states the flat posture
     *  explicitly (billing triple, D25): nothing metered to promise, the
     *  engine appends the CALL 1. */
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            // plain-english billing-surface name for the actor's `request`
            // charge event (design D24)
            label: "request fee",
            // the actor's charge-event this leaf line joins to
            vendor: "request",
            // survey-pinned GOLD-tier event price
            consumes: { credit: "default", amount: 0.002 },
        },
        estimate: () => ({ counts: {} }),
    },
});
