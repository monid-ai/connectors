import { defineEndpoint, presets, Unit, UsageModelKind } from "@shared/core";
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
    request: {
        method: "POST",
        path: "/v2/acts/automation-lab~snapchat-scraper/runs",
    },
    input: { schema: { body: zSnapchatScraperBody } },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
            kind: UsageModelKind.COMPOSITE,
            // component ids = the actor's charge-event names, VERBATIM
            // (live survey) — the broker card row key and the join key for
            // the stashed run-record rates (design D19)
            components: {
                "start": { kind: UsageModelKind.PER_CALL },
                "profile-scraped": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                },
            },
        },
        /** one profile per username — the endpoint's OWN pinned input fields
         *  (no probing: the schema is the source of truth). */
        estimate: presets.estimate.onePerQuery(["usernames"]),
    },
});
