import { z } from "zod";
import {
    promptItem,
    zDurationRange,
    zMediaUrl,
    zMultiShot,
    zNativeAudio,
    zResolution,
} from "../../../schema/video.ts";

/**
 * `POST /image-to-video/kling-3.0` body — the faithful vendor mirror (D25).
 * Live docs https://kling.ai/document-api/api/video/3-0-omni/image-to-video,
 * read 2026-09-16. No `aspect_ratio` — the output follows the first frame.
 * The `element` content type (an account-level asset library) and
 * `options` are deliberately absent (v1 scope).
 */
export const zImageToVideoKling30Body = z.object({
    contents: z
        .array(
            z.discriminatedUnion("type", [
                promptItem(
                    3072,
                    "Text prompt — positive and negative descriptions, max " +
                        "3072 characters (2500 recommended). Multi-shot: " +
                        '"shot 1, 5, ...; shot 2, 3, ..." — shot number, ' +
                        "seconds (each at least 1), prompt (max 512 " +
                        "characters); up to 6 shots whose seconds sum to " +
                        "the duration.",
                ),
                z.object({
                    type: z
                        .enum(["first_frame", "last_frame"])
                        .describe(
                            "first_frame: the opening image (required, at " +
                                "most one). last_frame: the closing image " +
                                "(optional, at most one, only alongside a " +
                                "first_frame).",
                        ),
                    url: zMediaUrl.describe(
                        "Public https:// URL of a JPG/JPEG/PNG: each side " +
                            "at least 300 px, aspect ratio between 1:2.5 " +
                            "and 2.5:1, at most 50 MB.",
                    ),
                }).strict(),
            ]),
        )
        .min(1)
        .describe(
            "The prompt and the frame images: one prompt item, exactly one " +
                "first_frame, optionally one last_frame.",
        ),
    settings: z.object({
        multi_shot: zMultiShot.optional(),
        audio: zNativeAudio.optional(),
        resolution: zResolution(["720p", "1080p", "4k"]).optional(),
        duration: zDurationRange(15).optional(),
    }).strict().optional(),
}).strict();
