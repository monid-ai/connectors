import { z } from "zod";
import { promptItem, zMediaUrl, zResolution } from "../../../schema/video.ts";

/**
 * `POST /motion-control/kling-2.6` body — the faithful vendor mirror (D25).
 * Live docs https://kling.ai/document-api/api/video/2-6/motion-control,
 * read 2026-09-16: a character image performs the motion of a reference
 * video; no `duration` (the output follows the clip) and no
 * `aspect_ratio`. `settings.character_orientation` is the one setting Kling
 * marks required. The `element` content type and `options` are
 * deliberately absent (v1 scope).
 */
export const zMotionControlKling26Body = z.object({
    contents: z
        .array(
            z.discriminatedUnion("type", [
                promptItem(
                    2500,
                    "Optional text prompt (max 2500 characters) to add " +
                        "scene elements or refine the motion.",
                ),
                z.object({
                    type: z
                        .literal("image")
                        .describe(
                            "The character to animate — upper or full body " +
                                "and head clearly visible, proportions " +
                                "matching the reference video. Exactly one.",
                        ),
                    url: zMediaUrl.describe(
                        "Public https:// URL of a JPG/JPEG/PNG: each side " +
                            "at least 300 px, aspect ratio between 1:2.5 " +
                            "and 2.5:1, at most 50 MB.",
                    ),
                }).strict(),
                z.object({
                    type: z
                        .literal("video")
                        .describe(
                            "The motion reference — one person, a single " +
                                "continuous take. Exactly one.",
                        ),
                    url: zMediaUrl.describe(
                        "Public https:// URL of an MP4/MOV: at least 3 s, " +
                            "at most 30 s (character_orientation video) or " +
                            "10 s (image), each side 340-3850 px, at most " +
                            "100 MB.",
                    ),
                }).strict(),
            ]),
        )
        .min(2)
        .describe(
            "Exactly one image (the character) and one video (the motion " +
                "reference), plus an optional prompt.",
        ),
    settings: z.object({
        character_orientation: z
            .enum(["image", "video"])
            .describe(
                "Whose framing the character follows: video (reference " +
                    "clip up to 30 s) or image (reference clip up to 10 s).",
            ),
        audio: z
            .enum(["original", "off"])
            .describe(
                "original: keep the reference video's sound. off: silent. " +
                    "Kling defaults to original. No price impact.",
            )
            .optional(),
        resolution: zResolution(["720p", "1080p"]).optional(),
    }).strict().optional(),
}).strict();
