import { z } from "zod";
import {
    promptItem,
    zDurationChoice,
    zMediaUrl,
    zResolution,
} from "../../../schema/video.ts";

/**
 * `POST /image-to-video/kling-2.5-turbo` body — the faithful vendor mirror
 * (D25). Live docs https://kling.ai/document-api/api/video/2-5-turbo/image-to-video,
 * read 2026-09-16: prompt max 2500 (v1 said 3072), duration 5 | 10, no
 * audio, no 4K. `options` deliberately absent.
 */
export const zImageToVideoKling25TurboBody = z.object({
    contents: z
        .array(
            z.discriminatedUnion("type", [
                promptItem(
                    2500,
                    "Text prompt — positive and negative descriptions, max " +
                        "2500 characters.",
                ),
                z.object({
                    type: z
                        .enum(["first_frame", "last_frame"])
                        .describe(
                            "first_frame: the opening image (required, at " +
                                "most one). last_frame: the closing image " +
                                "(optional, at most one, only alongside a " +
                                "first_frame; needs resolution 1080p).",
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
        resolution: zResolution(["720p", "1080p"]).optional(),
        duration: zDurationChoice.optional(),
    }).strict().optional(),
}).strict();
