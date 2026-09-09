import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTiktokProfileScraperBody } from "./schema/inputs.ts";

/**
 * apidojo/tiktok-profile-scraper — Get TikTok Profile. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get TikTok Profile",
        summary: "Scrape TikTok user profiles and full post histories by " +
            "username or URL.",
        description:
            "Scrapes TikTok user profiles and full post histories by " +
            "username or URL. Returns account details (bio, " +
            "verification status, follower/following counts, total " +
            "videos), per-post engagement metrics (views, likes, " +
            "comments, shares, bookmarks), timestamps, hashtags, " +
            "collaboration metadata, video technical metadata " +
            "(dimensions, duration, media URLs, covers), and " +
            "audio/song metadata. Suited for influencer research, " +
            "lead generation, and brand-deal analysis.",
        docsUrl: "https://apify.com/apidojo/tiktok-profile-scraper",
        categories: ["tiktok"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/apidojo/tiktok-profile-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/apidojo~tiktok-profile-scraper/runs",
    },
    input: {
        schema: {
            // maxItems is the PRIMARY limiting knob (the actor accepts an
            // absent maxItems = full post history; live schema has prefill
            // 1000 only — an editor hint, NOT a server default) — WE
            // require it: the estimate must be deducible to price the hold
            // (D24/D25). No extra .min(1) floor: the actor documents
            // absent = unbounded, but publishes no 0-sentinel.
            body: zTiktokProfileScraperBody.required({ maxItems: true }),
        },
    },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** maxItems caps the run exactly (v1 LIMIT_IS_EXACT) — required
         *  at the binding, so the estimate is pure arithmetic (D24). */
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.body.maxItems },
        }),
    },
});
