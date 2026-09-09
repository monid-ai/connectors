import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zInstagramProfileScraperBody } from "./schema/inputs.ts";

/**
 * apify/instagram-profile-scraper — Get Instagram Profile. Pure data; the
 * async machinery is inherited leaf-wise from the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Instagram Profile",
        summary:
            "Extract public Instagram profile metadata and recent media by username, ID, or URL.",
        description:
            "Extracts public Instagram profile metadata and recent media " +
            "for one or more accounts by username, ID, or URL. Returns " +
            "bio, profile pictures, contact links, business category, " +
            "verification status, audience metrics (followers, following, " +
            "post/video/highlight totals), join date, related accounts, " +
            "and detailed recent media items with captions, hashtags, " +
            "mentions, media URLs, engagement metrics, and tagged users. " +
            "One result per account. Runs asynchronously.",
        docsUrl: "https://apify.com/apify/instagram-profile-scraper",
        categories: ["instagram"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/apify/instagram-profile-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/apify~instagram-profile-scraper/runs",
    },
    input: {
        schema: {
            // usernames is the whole billed quantity (one profile each) —
            // the actor requires the field but accepts an empty list; WE
            // require it non-empty: the estimate must be deducible to
            // price the hold (D24)
            body: zInstagramProfileScraperBody.extend({
                "usernames": zInstagramProfileScraperBody.shape.usernames
                    .min(1),
            }),
        },
    },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** one profile per username (v1 ONE_PER_QUERY) — required
         *  non-empty at the binding, so the estimate is pure arithmetic
         *  (D24). */
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.body.usernames.length },
        }),
    },
});
