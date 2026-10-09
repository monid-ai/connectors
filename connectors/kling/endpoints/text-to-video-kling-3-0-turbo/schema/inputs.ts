import { z } from "zod";
import {
    zAspectRatio,
    zDurationRange,
    zResolution,
} from "../../../schema/video.ts";

/**
 * `POST /text-to-video/kling-3.0-turbo` body — the faithful vendor mirror
 * (D25). Live docs https://kling.ai/document-api/api/video/3-0-turbo/text-to-video,
 * read 2026-09-16: Turbo publishes NO `audio` and NO `multi_shot` setting
 * (it always ships native audio) and no 4K. `options` deliberately absent.
 */
export const zTextToVideoKling30TurboBody = z.object({
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
        resolution: zResolution(["720p", "1080p"]).optional(),
        aspect_ratio: zAspectRatio.optional(),
        duration: zDurationRange(15).optional(),
    }).strict().optional(),
}).strict();
