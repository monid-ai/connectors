import { z } from "zod";

/** POST /api/youtube/comments/sync body — the vendor mirror (the
 *  marketplace card via v1, 2026-09-17). */
export const zYoutubeCommentsBody = z.object({
    videoId: z.string().regex(/^[A-Za-z0-9_-]{6,20}$/).describe(
        "YouTube video ID from the watch URL's v parameter, e.g. " +
            "'5TN6l7JGWvs'.",
    ),
}).strict();
