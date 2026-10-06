import { z } from "zod";
import { zDepth, zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/serp/youtube/video_comments/live/advanced` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zSerpYoutubeCommentsBody = z.object({
    video_id: z.string().min(1).max(64).describe(
        "YouTube video id, e.g. 'Y8Wu4rSNJms'.",
    ),
    ...zLocaleFields,
    device: z.string().min(1).describe("Device type").optional(),
    os: z.string().min(1).describe("Os").optional(),
    depth: zDepth(200, 20, 20),
}).strict();
