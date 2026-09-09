import { z } from "zod";
import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFacebookProfilePostsScraperBody } from "./schema/inputs.ts";

// ─── Binding-site mode variants (D24) ───────────────────────────────────────
// The actor mirror (schema/inputs.ts) keeps every field optional; the
// BINDING requires, per mode, the one textarea that mode reads (non-empty)
// and — in post modes, where max_posts caps billed output and absent/0
// means "fetch ALL" — max_posts ≥ 1.
const zBase = zFacebookProfilePostsScraperBody;
const zUrlsText = zBase.shape.urls_text.unwrap().min(1);
const zIdsText = zBase.shape.ids_text.unwrap().min(1);
const zKeywordsText = zBase.shape.keywords_text.unwrap().min(1);
const zMaxPosts = zBase.shape.max_posts.unwrap().min(1);

const zModePostsByUrl = zBase.extend({
    "endpoint": z.literal("profile_posts_by_url"),
    "urls_text": zUrlsText,
    "max_posts": zMaxPosts,
});
const zModePostsById = zBase.extend({
    "endpoint": z.literal("profile_posts"),
    "ids_text": zIdsText,
    "max_posts": zMaxPosts,
});
const zModeSearchPosts = zBase.extend({
    "endpoint": z.literal("search_posts_by_keyword"),
    "keywords_text": zKeywordsText,
    "max_posts": zMaxPosts,
});
const zModeDetailsById = zBase.extend({
    "endpoint": z.literal("details_by_id"),
    "ids_text": zIdsText,
});
const zModeDetailsByUrl = zBase.extend({
    "endpoint": z.literal("details_by_url"),
    "urls_text": zUrlsText,
});
const zModeProfileIdByUrl = zBase.extend({
    "endpoint": z.literal("profile_id_by_url"),
    "urls_text": zUrlsText,
});

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
            // ONE actor, SIX modes — each mode reads exactly one target
            // textarea, and the actor reads absent/0 max_posts as "fetch
            // ALL" — WE bind a per-mode variant (discriminated on
            // `endpoint`) that requires that mode's textarea and, in post
            // modes, max_posts ≥ 1: the estimate must be deducible to
            // price the hold (D24). schema/inputs.ts stays the faithful
            // actor mirror.
            body: z.discriminatedUnion("endpoint", [
                zModePostsByUrl,
                zModePostsById,
                zModeSearchPosts,
                zModeDetailsById,
                zModeDetailsByUrl,
                zModeProfileIdByUrl,
            ]),
        },
    },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** CUSTOM estimate (v1: "no single estimationLabel is true here"):
         *  detail/id modes → one result per target line; post modes →
         *  target lines × max_posts (and profile_posts_by_url emits one
         *  extra profile-id record per target — confirmed live in v1).
         *  Every field read is guaranteed by the mode's binding variant,
         *  so the estimate is pure arithmetic (D24). */
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
                    const n = lines(body.urls_text);
                    return {
                        counts: { "RESULT": n * body.max_posts + n },
                    };
                }
                case "profile_posts":
                    return {
                        counts: {
                            "RESULT": lines(body.ids_text) *
                                body.max_posts,
                        },
                    };
                case "search_posts_by_keyword":
                    return {
                        counts: {
                            "RESULT": lines(body.keywords_text) *
                                body.max_posts,
                        },
                    };
                case "details_by_id":
                    return {
                        counts: { "RESULT": lines(body.ids_text) },
                    };
                default:
                    // details_by_url | profile_id_by_url
                    return {
                        counts: { "RESULT": lines(body.urls_text) },
                    };
            }
        },
    },
});
