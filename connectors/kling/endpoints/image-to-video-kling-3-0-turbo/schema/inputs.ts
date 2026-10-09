import { z } from "zod";
import {
    promptItem,
    zDurationRange,
    zMediaUrl,
    zResolution,
} from "../../../schema/video.ts";

/**
 * `POST /image-to-video/kling-3.0-turbo` body — the faithful vendor mirror
 * (D25). Live docs https://kling.ai/document-api/api/video/3-0-turbo/image-to-video,
 * read 2026-09-16: prompt max 2500 (the Turbo TEXT endpoint says 3072),
 * first_frame ONLY (no last frame), no `audio` / `multi_shot` setting, no
 * 4K. `options` deliberately absent.
 */
export const zImageToVideoKling30TurboBody = z.object({
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
                        .literal("first_frame")
                        .describe(
                            "The opening image (required, at most one). " +
                                "Turbo does not accept a last frame.",
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
            "The prompt and the frame image: one prompt item and exactly " +
                "one first_frame.",
        ),
    settings: z.object({
        resolution: zResolution(["720p", "1080p"]).optional(),
        duration: zDurationRange(15).optional(),
    }).strict().optional(),
}).strict();
