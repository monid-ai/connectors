import { z } from "zod";
import {
    promptItem,
    zAspectRatio,
    zDurationRange,
    zMediaUrl,
    zResolution,
} from "../../../schema/video.ts";

/**
 * `POST /omni-video/kling-o1` body — the faithful vendor mirror (D25). Live
 * docs https://kling.ai/document-api/api/video/o1/video-omni, read
 * 2026-09-16: prompt max 2500 (v1 said 3072), duration 3-10, 720p/1080p
 * only, audio original | off (no native), no multi-shot, reference videos
 * 3-10 s. The `element` content type and `options` are deliberately absent
 * (v1 scope).
 */
const zMediaId = z
    .string()
    .min(1)
    .max(64)
    .describe(
        "Handle to reference this item from the prompt as @<id> (e.g. " +
            "image_1, video_1). Unique within the request.",
    );

export const zOmniVideoKlingO1Body = z.object({
    contents: z
        .array(
            z.discriminatedUnion("type", [
                promptItem(
                    2500,
                    "Text prompt — positive and negative descriptions, max " +
                        "2500 characters. Refer to media by the id you gave " +
                        "it: @image_1, @video_1.",
                ),
                z.object({
                    type: z
                        .enum(["first_frame", "last_frame", "refer_image"])
                        .describe(
                            "first_frame / last_frame pin the opening and " +
                                "closing images (last requires first; at " +
                                "most one each). refer_image supplies a " +
                                "reference for subject, scene or style " +
                                "(up to 7 without a video, 4 with one).",
                        ),
                    url: zMediaUrl.describe(
                        "Public https:// URL of a JPG/JPEG/PNG: each side " +
                            "at least 300 px, aspect ratio between 1:2.5 " +
                            "and 2.5:1, at most 50 MB.",
                    ),
                    id: zMediaId.optional(),
                }).strict(),
                z.object({
                    type: z
                        .enum(["feature_video", "base_video"])
                        .describe(
                            "feature_video borrows a clip's motion or " +
                                "style; base_video is the clip to EDIT. At " +
                                "most one video per request; either " +
                                "selects the with-video rate.",
                        ),
                    url: zMediaUrl.describe(
                        "Public https:// URL of an MP4/MOV: 3-10 s, each " +
                            "side 700-2160 px, 24-60 fps, at most 200 MB.",
                    ),
                    id: zMediaId.optional(),
                }).strict(),
            ]),
        )
        .min(1)
        .describe(
            "The prompt and the reference material: one prompt item, then " +
                "any mix of first_frame / last_frame / refer_image images " +
                "and at most one feature_video or base_video. Omit the " +
                "media for pure text-to-video.",
        ),
    settings: z.object({
        audio: z
            .enum(["original", "off"])
            .describe(
                "original: keep the input video's own sound. off: silent. " +
                    "Kling defaults to off. No price impact.",
            )
            .optional(),
        resolution: zResolution(["720p", "1080p"]).optional(),
        aspect_ratio: zAspectRatio.optional(),
        duration: zDurationRange(10).optional(),
    }).strict().optional(),
}).strict();
