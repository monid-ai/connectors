import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFacebookProfilePostsScraperBody } from "./schema/inputs.ts";

/**
 * cleansyntax/facebook-profile-posts-scraper — Pull Facebook Profile Posts. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Pull Facebook Profile Posts",
        summary: "Collect public Facebook profile posts, profile details, " +
            "or a profile ID, by profile URL or ID.",
        description: "Fetches public Facebook profile data through one actor " +
            "with a selectable mode: recent profile posts by URL or " +
            "by profile ID, keyword post search, profile details by " +
            "ID or URL, and profile ID resolution from a URL. Post " +
            "records return post ID, type, permalink, message text, " +
            "timestamp, comment/reaction/reshare counts, a per-type " +
            "reaction breakdown, author metadata, and media assets " +
            "(image, video, video files, video thumbnail, album " +
            "preview, external link). Detail records return the " +
            "profile metadata payload, and the ID lookup returns the " +
            "resolved profile ID. Targets are supplied one per line " +
            "and optional start/end dates narrow the post range.",
        docsUrl: "https://apify.com/cleansyntax/facebook-profile-posts-scraper",
        categories: [],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/cleansyntax/facebook-profile-posts-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/cleansyntax~facebook-profile-posts-scraper/runs",
    },
    input: {
        schema: {
            // max_posts is the primary limiting knob in post modes, and
            // the actor documents "Set 0 (default) to fetch all
            // available" (unbounded) — WE require it and floor it at 1
            // (unwrap keeps the inner int/min(0) checks): the estimate
            // must be deducible to price the hold (D25). The mode
            // textareas stay optional, as on the actor; `endpoint` is
            // actor-required via the mirror.
            body: zFacebookProfilePostsScraperBody.extend({
                max_posts: zFacebookProfilePostsScraperBody.shape
                    .max_posts.unwrap().min(1),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            // the actor's charge-event this leaf line joins to
            vendor: "apify-default-dataset-item",
            // survey-pinned GOLD-tier event price
            consumes: { credit: "default", amount: 0.006 },
        },
        /** CUSTOM estimate (v1: "no single estimationLabel is true here"):
         *  detail/id modes → one result per target line; post modes →
         *  target lines × max_posts (and profile_posts_by_url emits one
         *  extra profile-id record per target — confirmed live in v1).
         *  max_posts is required at the binding; the mode textareas are
         *  optional and absent ≡ blank, so a missing textarea yields 0
         *  lines and an estimate of 0, which is correct (D25). */
        estimate: ({ data }) => {
            const body = data.input.body;
            // targets are one-per-line — count non-blank lines (inlined:
            // fn bodies are CLOSED TERMS, no module-scope helpers)
            const lines = (text: string): number =>
                text.split("\n").map((line) => line.trim())
                    .filter((line) => line !== "").length;
            // leaf PER_UNIT·RESULT doc: the counts key is the model's unit
            switch (body.endpoint) {
                case "profile_posts_by_url": {
                    const n = lines(body.urls_text ?? "");
                    return {
                        counts: { "RESULT": n * body.max_posts + n },
                    };
                }
                case "profile_posts":
                    return {
                        counts: {
                            "RESULT": lines(body.ids_text ?? "") *
                                body.max_posts,
                        },
                    };
                case "search_posts_by_keyword":
                    return {
                        counts: {
                            "RESULT": lines(body.keywords_text ?? "") *
                                body.max_posts,
                        },
                    };
                case "details_by_id":
                    return {
                        counts: { "RESULT": lines(body.ids_text ?? "") },
                    };
                default:
                    // details_by_url | profile_id_by_url
                    return {
                        counts: { "RESULT": lines(body.urls_text ?? "") },
                    };
            }
        },
    },
});
