import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zApifyRedditApiBody } from "./schema/inputs.ts";

/**
 * practicaltools/apify-reddit-api — Reddit API. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Reddit API",
        summary: "Extract structured Reddit data via Reddit's official " +
            "OAuth2 API: subreddits, posts, comments, users.",
        description: "Extracts structured Reddit data via Reddit's official " +
            "OAuth2 API. Returns subreddit metadata, post metadata " +
            "(title, body text, timestamps, vote counts, comment " +
            "counts, media links), comment threads with nested " +
            "replies, and user profile metadata including karma and " +
            "recent activity. Supports URL-driven mode (subreddit " +
            "feeds, individual posts with comments, user profiles) " +
            "and search mode (site-wide or subreddit-scoped keyword " +
            "search) with configurable sorting and time filters. " +
            "Suited for training AI models, bulk historical data, " +
            "and sentiment analysis.",
        docsUrl: "https://apify.com/practicaltools/apify-reddit-api",
        categories: ["reddit"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/practicaltools/apify-reddit-api",
    request: {
        method: "POST",
        path: "/v2/acts/practicaltools~apify-reddit-api/runs",
    },
    input: {
        schema: {
            // maxItems is the PRIMARY limiting knob (applies PER JOB; actor
            // docs: "2 search queries × maxItems 25 = up to 50 posts") —
            // required at the binding (even though the actor publishes a
            // default): the estimate must be deducible to price the hold
            // (D24/D25). startUrls and searches are ALTERNATIVE multiplier
            // arrays and stay the plain optional mirror — no jobs means a
            // genuine zero-item promise, not an error.
            body: zApifyRedditApiBody.required({ maxItems: true }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            // the actor's charge-event this leaf line joins to
            vendor: "item_returned",
            // survey-pinned GOLD-tier event price
            consumes: { credit: "default", amount: 0.002 },
        },
        /** maxItems (required at the binding) × jobs, where jobs =
         *  startUrls + searches entries (each is billed up to maxItems —
         *  old estimate missed `searches`). An absent array is a genuine
         *  zero-job term (honest optionality, estimate 0), not a masked
         *  default (D24). */
        estimate: ({ data }) => {
            const body = data.input.body;
            const jobs = (body.startUrls?.length ?? 0) +
                (body.searches?.length ?? 0);
            return { counts: { "RESULT": body.maxItems * jobs } };
        },
    },
});
