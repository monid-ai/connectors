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
    input: { schema: { body: zFacebookProfilePostsScraperBody } },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** CUSTOM estimate (v1: "no single estimationLabel is true here"):
         *  ONE actor, SIX modes, and NEWLINE-separated target textareas no
         *  flat array-multiplier rule can see. Detail/id modes →
         *  one result per target; post modes → targets × max_posts (and
         *  profile_posts_by_url emits one extra profile-id record per
         *  target — confirmed live in v1). */
        estimate: ({ data }) => {
            const body = data.input.body;
            const mode = body.endpoint;
            const text = mode === "profile_posts" || mode === "details_by_id"
                ? body.ids_text
                : mode === "search_posts_by_keyword"
                ? body.keywords_text
                : body.urls_text;
            const targets = text !== undefined
                ? text.split("\n").map((line) => line.trim())
                    .filter((line) => line !== "").length
                : 0;
            const n = Math.max(targets, 1);
            const isPostMode = mode === "profile_posts_by_url" ||
                mode === "profile_posts" ||
                mode === "search_posts_by_keyword";
            const cap = body.max_posts ?? 3;
            const amount = isPostMode
                ? n * cap + (mode === "profile_posts_by_url" ? n : 0)
                : n;
            // leaf PER_UNIT·RESULT doc: the counts key is the model's unit
            return { counts: { "RESULT": amount } };
        },
    },
});
