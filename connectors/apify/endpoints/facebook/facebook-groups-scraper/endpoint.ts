import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFacebookGroupsScraperBody } from "./schema/inputs.ts";

/**
 * apify/facebook-groups-scraper — Pull Facebook Group Posts. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Pull Facebook Group Posts",
        summary: "Scrape posts and comments from public Facebook groups.",
        description:
            "Scrapes posts and comments from public Facebook groups. " +
            "Returns post text and URLs, author identifiers, " +
            "timestamps, engagement metrics (likes, reactions, " +
            "shares, reaction breakdowns), top comments with " +
            "metadata, attachments and media assets (image/video " +
            "URLs, thumbnails, dimensions), and OCR-extracted text " +
            "from images. Supports sorting and filtering by " +
            "relevance, timeframe, activity, or keyword.",
        docsUrl: "https://apify.com/apify/facebook-groups-scraper",
        categories: ["facebook"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/apify/facebook-groups-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/apify~facebook-groups-scraper/runs",
    },
    input: {
        schema: {
            // the actor accepts an absent resultsLimit (scrapes as many
            // posts as possible; prefill 20 is editor-only, NOT a server
            // default) — WE require it (inner min(1) kept by .required,
            // zod 4) and require a non-empty startUrls batch: the
            // estimate must be deducible to price the hold (D24)
            body: zFacebookGroupsScraperBody
                .required({ "resultsLimit": true })
                .extend({
                    "startUrls": zFacebookGroupsScraperBody.shape
                        .startUrls.min(1),
                }),
        },
    },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
            kind: UsageModelKind.COMPOSITE,
            // component ids = the actor's charge-event names, VERBATIM
            // (live survey) — the broker card row key and the join key for
            // the stashed run-record rates (design D19)
            components: {
                "actor-start": {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                },
                "post": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "posts",
                },
            },
        },
        /** resultsLimit posts per group url (v1 PER_QUERY_LIMIT) — both
         *  required at the binding, so the estimate is pure arithmetic
         *  (D24). */
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    "post": body.resultsLimit * body.startUrls.length,
                },
            };
        },
    },
});
