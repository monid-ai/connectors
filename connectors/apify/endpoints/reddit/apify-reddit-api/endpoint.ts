import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zApifyRedditApiBody } from "./schema/inputs.ts";

/**
 * practicaltools/apify-reddit-api — Reddit API. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
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
            // maxItems applies PER JOB, and every search query, subreddit or
            // URL is its own job (actor docs: "2 search queries × maxItems
            // 25 = up to 50 posts") — the actor accepts a run with neither
            // input; WE require at least one job so the multiplier is
            // non-zero: the estimate must be deducible to price the hold
            // (D24). startUrls and searches are ALTERNATIVES, so neither is
            // individually required.
            body: zApifyRedditApiBody.refine(
                (b) =>
                    (b.startUrls?.length ?? 0) + (b.searches?.length ?? 0) > 0,
                "at least one of startUrls or searches must be non-empty",
            ),
        },
    },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** maxItems (actor server default 25, verified live) × jobs, where
         *  jobs = startUrls + searches entries (each is billed up to
         *  maxItems — old estimate missed `searches`). The binding
         *  guarantees ≥ 1 job, so an absent array is a genuine zero-job
         *  term, not a masked default (D24). */
        estimate: ({ data }) => {
            const body = data.input.body;
            const jobs = (body.startUrls?.length ?? 0) +
                (body.searches?.length ?? 0);
            return { counts: { "RESULT": body.maxItems * jobs } };
        },
    },
});
