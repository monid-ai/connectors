import { z } from "zod";
import {
    promptItem,
    zAspectRatio,
    zDurationRange,
    zMediaUrl,
    zMultiShot,
    zResolution,
} from "../../../schema/video.ts";

/**
 * `POST /omni-video/kling-3.0-omni` body — the faithful vendor mirror
 * (D25). Live docs https://kling.ai/document-api/api/video/3-0-omni/video-omni,
 * read 2026-09-16. One request mixes a prompt with reference images,
 * first/last frames, a feature-reference video or a base video to edit.
 * The `element` content type (an account-level asset library) and
 * `options` are deliberately absent (v1 scope). The many count and
 * combination rules are cross-field and live in the endpoint's notes.
 */
const zMediaId = z
    .string()
    .min(1)
    .max(64)
    .describe(
        "Handle to reference this item from the prompt as @<id> (e.g. " +
            "image_1, video_1). Unique within the request.",
    );

export const zOmniVideoKling30OmniBody = z.object({
    contents: z
        .array(
            z.discriminatedUnion("type", [
                promptItem(
                    3072,
                    "Text prompt — positive and negative descriptions, max " +
                        "3072 characters (2500 recommended). Refer to media " +
                        "by the id you gave it: @image_1, @video_1. " +
                        'Multi-shot: "shot 1, 5, ...; shot 2, 3, ..." — ' +
                        "shot number, seconds (each at least 1), prompt " +
                        "(max 512 characters); up to 6 shots whose seconds " +
                        "sum to the duration.",
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
                        "Public https:// URL of an MP4/MOV: 3-15.5 s, each " +
                            "side 700-4553 px (at most 8,294,400 px in " +
                            "area), aspect ratio between 0.4 and 2, 24-60 " +
                            "fps, at most 200 MB.",
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
        multi_shot: zMultiShot.optional(),
        audio: z
            .enum(["native", "original", "off"])
            .describe(
                "native: generate synchronized audio (only without a " +
                    "video input; raises the rate). original: keep the " +
                    "input video's own sound. off: silent. Kling defaults " +
                    "to off.",
            )
            .optional(),
        resolution: zResolution(["720p", "1080p", "4k"]).optional(),
        aspect_ratio: zAspectRatio.optional(),
        duration: zDurationRange(15).optional(),
    }).strict().optional(),
}).strict();
