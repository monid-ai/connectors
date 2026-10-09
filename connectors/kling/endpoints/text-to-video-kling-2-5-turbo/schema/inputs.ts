import { z } from "zod";
import {
    zAspectRatio,
    zDurationChoice,
    zResolution,
} from "../../../schema/video.ts";

/**
 * `POST /text-to-video/kling-2.5-turbo` body — the faithful vendor mirror
 * (D25). Live docs https://kling.ai/document-api/api/video/2-5-turbo/text-to-video,
 * read 2026-09-16: prompt max 2500 (v1 said 3072), duration 5 | 10, no
 * audio, no 4K. `options` deliberately absent.
 */
export const zTextToVideoKling25TurboBody = z.object({
    prompt: z
        .string()
        .min(1)
        .max(2500)
        .describe(
            "Text prompt — positive and negative descriptions, max 2500 " +
                "characters.",
        ),
    settings: z.object({
        resolution: zResolution(["720p", "1080p"]).optional(),
        aspect_ratio: zAspectRatio.optional(),
        duration: zDurationChoice.optional(),
    }).strict().optional(),
}).strict();
