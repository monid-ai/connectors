import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFacebookEventsScraperBody } from "./schema/inputs.ts";

/**
 * apify/facebook-events-scraper — Search Facebook Events. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Facebook Events",
        summary: "Extract Facebook event listings by search query, page, " +
            "or event URL.",
        description: "Extracts event listings and metadata from Facebook " +
            "pages, event URLs, or search queries with filters. " +
            "Returns event names, schedules (start date and time), " +
            "descriptions, locations, organizer information, " +
            "interested/attending counts, and ticket details for " +
            "event intelligence and local activity tracking.",
        docsUrl: "https://apify.com/apify/facebook-events-scraper",
        categories: ["facebook"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/apify/facebook-events-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/apify~facebook-events-scraper/runs",
    },
    input: { schema: { body: zFacebookEventsScraperBody } },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
            kind: UsageModelKind.COMPOSITE,
            // component ids = the actor's charge-event names, VERBATIM
            // (live survey) — the broker card row key and the join key for
            // the stashed run-record rates (design D19)
            components: {
                "actor-start": { kind: UsageModelKind.PER_CALL },
                "event": { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
            },
        },
        /** maxEvents × (searchQueries + startUrls) — TWO multiplier
         *  arrays, so an inline fn (D19 addendum). The schema is the
         *  source of truth: typed body access, no probing. */
        estimate: ({ data }) => {
            const body = data.input.body;
            if (body.maxEvents === undefined) {
                return { counts: { "event": 3 } };
            }
            const n = (body.searchQueries?.length ?? 0) +
                (body.startUrls?.length ?? 0);
            return { counts: { "event": body.maxEvents * Math.max(n, 1) } };
        },
    },
});
