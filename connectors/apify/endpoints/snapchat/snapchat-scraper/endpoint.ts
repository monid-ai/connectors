import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSnapchatScraperBody } from "./schema/inputs.ts";

/**
 * automation-lab/snapchat-scraper — Get Snapchat Profile. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Snapchat Profile",
        summary: "Scrape public Snapchat profile cards by username or " +
            "profile URL.",
        description: "Scrapes public Snapchat profile cards from usernames, " +
            "@handles, or profile URLs without a Snapchat login. " +
            "Returns username, display name, profile type, " +
            "subscriber count, bio, website, verified badge, " +
            "category and subcategory, profile picture and Snapcode " +
            "URLs, hero image, story and highlight/Spotlight/lens " +
            "indicators and counts, related accounts, business " +
            "profile ID and address. Supports batches of usernames " +
            "and an optional expansion to up to 50 related public " +
            "accounts per run. Suited for creator discovery, " +
            "influencer vetting, and brand audience research on " +
            "Snapchat.",
        docsUrl: "https://apify.com/automation-lab/snapchat-scraper",
        categories: ["snapchat"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/automation-lab/snapchat-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/automation-lab~snapchat-scraper/runs",
    },
    input: {
        schema: {
            // usernames (the seed-profile multiplier) stays the plain
            // actor-required mirror — an empty list is a genuine zero-item
            // promise. relatedProfilesLimit is a secondary knob the
            // estimate reads: the binding pins the actor's OWN verified
            // server default (0), materialized into the body before any
            // hook runs (D24/D25).
            body: zSnapchatScraperBody.extend({
                relatedProfilesLimit: zSnapchatScraperBody.shape
                    .relatedProfilesLimit.unwrap().default(0),
            }),
        },
    },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
            kind: UsageModelKind.COMPOSITE,
            // component ids are OUR snake_case keys (the broker card row
            // key); `vendor:` pins the actor's charge-event name verbatim
            // where it differs — the join key for the stashed run-record
            // rates (design D19/D26)
            components: {
                start: {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                    // survey-pinned GOLD-tier event price
                    consumes: { credit: "default", amount: 0.005 },
                },
                profile_scraped: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "profiles",
                    vendor: "profile-scraped",
                    consumes: { credit: "default", amount: 0.0013 },
                },
            },
        },
        /** one profile per seed username, PLUS up to relatedProfilesLimit
         *  related profiles per RUN — each emitted related profile is a
         *  billed `profile-scraped` event (v1 held it via `buffer`). The
         *  binding pins the actor's OWN server default (0, verified live)
         *  and usernames is actor-required — pure arithmetic (D24). */
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    "profile_scraped": body.usernames.length +
                        body.relatedProfilesLimit,
                },
            };
        },
    },
});
