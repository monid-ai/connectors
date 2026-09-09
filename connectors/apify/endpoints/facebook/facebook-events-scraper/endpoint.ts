import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFacebookEventsScraperBody } from "./schema/inputs.ts";

/**
 * apify/facebook-events-scraper — Search Facebook Events. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
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
    input: {
        schema: {
            // the actor accepts an absent maxEvents (extracts unbounded;
            // prefill 30 is editor-only, NOT a server default) — WE
            // require it (inner min(1) kept by .required, zod 4): the
            // estimate must be deducible to price the hold (D25)
            body: zFacebookEventsScraperBody.required({ maxEvents: true }),
        },
    },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
            kind: UsageModelKind.COMPOSITE,
            // component ids are OUR snake_case keys; `vendor` carries the
            // actor's charge-event name verbatim when it differs — the
            // broker card row key and the join key for the stashed
            // run-record rates (design D19)
            components: {
                actor_start: {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                    vendor: "actor-start",
                    // survey-pinned GOLD-tier event price
                    consumes: { credit: "default", amount: 0.001 },
                },
                event: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "events",
                    consumes: { credit: "default", amount: 0.007 },
                },
            },
        },
        /** maxEvents × (searchQueries + startUrls) — maxEvents required at
         *  the binding (v1 PER_QUERY_LIMIT); both query arrays are
         *  optional and absent ≡ empty, so an all-empty query set
         *  estimates 0, which is correct (D25). */
        estimate: ({ data }) => {
            const body = data.input.body;
            const n = (body.searchQueries?.length ?? 0) +
                (body.startUrls?.length ?? 0);
            return { counts: { "event": body.maxEvents * n } };
        },
    },
});
