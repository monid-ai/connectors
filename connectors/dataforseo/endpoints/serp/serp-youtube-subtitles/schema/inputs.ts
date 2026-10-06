import { z } from "zod";
import { zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/serp/youtube/video_subtitles/live/advanced` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zSerpYoutubeSubtitlesBody = z.object({
    ...zLocaleFields,
    video_id: z.string().min(1).max(64).describe(
        "YouTube video id, e.g. 'Y8Wu4rSNJms'.",
    ),
    subtitles_language: z.string().min(2).max(10).describe(
        "Subtitle language code, e.g. 'en'; default is the video language.",
    ).optional(),
    subtitles_translate_language: z.string().min(2).max(10).describe(
        "Translate the subtitles into this language code.",
    ).optional(),
}).strict();
