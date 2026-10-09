import { z } from "zod";
import {
    zAspectRatio,
    zDurationRange,
    zMultiShot,
    zNativeAudio,
    zResolution,
} from "../../../schema/video.ts";

/**
 * `POST /text-to-video/kling-3.0` body — the faithful vendor mirror (D25):
 * optionality only, no defaults (those live at the binding). Live docs
 * https://kling.ai/document-api/api/video/3-0-omni/text-to-video, read
 * 2026-09-16. `options` (callback_url, external_task_id, watermark_info) is
 * deliberately absent — v1 never exposed callbacks or watermarked outputs —
 * and `.strict()` keeps it out.
 */
export const zTextToVideoKling30Body = z.object({
    prompt: z
        .string()
        .min(1)
        .max(3072)
        .describe(
            "Text prompt — positive and negative descriptions, max 3072 " +
                'characters (2500 recommended). Multi-shot: "shot 1, 5, ' +
                '...; shot 2, 3, ..." — shot number, seconds (each at least ' +
                "1), prompt (max 512 characters); up to 6 shots whose " +
                "seconds sum to the duration.",
        ),
    settings: z.object({
        multi_shot: zMultiShot.optional(),
        audio: zNativeAudio.optional(),
        resolution: zResolution(["720p", "1080p", "4k"]).optional(),
        aspect_ratio: zAspectRatio.optional(),
        duration: zDurationRange(15).optional(),
    }).strict().optional(),
}).strict();
