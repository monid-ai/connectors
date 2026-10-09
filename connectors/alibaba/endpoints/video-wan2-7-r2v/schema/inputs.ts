import { z } from "zod";
import {
    zMediaUrl,
    zNegativePrompt,
    zPromptExtend,
    zResolution,
    zSeed,
    zWanRatio,
    zWatermark,
} from "../../../schema/dashscope.ts";

/**
 * `POST /api/v1/services/aigc/video-generation/video-synthesis` body for
 * `wan2.7-r2v` — the faithful vendor mirror (D25). Live docs
 * https://www.alibabacloud.com/help/en/model-studio/wan-video-to-video-api-reference,
 * read 2026-09-16.
 */
export const zWan27R2vBody = z.object({
    input: z.object({
        prompt: z
            .string()
            .min(1)
            .max(5000)
            .describe(
                "Text prompt (max 5,000 characters; longer text is " +
                    "truncated upstream). Refer to references by ordinal — " +
                    '"Image 1", "Video 1" — numbered per type in media[] ' +
                    "order (images and videos count separately).",
            ),
        negative_prompt: zNegativePrompt.optional(),
        media: z
            .array(
                z.object({
                    type: z
                        .enum([
                            "reference_image",
                            "reference_video",
                            "first_frame",
                        ])
                        .describe(
                            "reference_image (subject or scene; a subject " +
                                "image must contain ONE character), " +
                                "reference_video (MP4/MOV 1-30 s, single " +
                                "character, its voice reused when present), " +
                                "or first_frame (max 1) to pin the opening.",
                        ),
                    url: zMediaUrl.describe(
                        "Public https:// URL of the asset: images JPEG/PNG/" +
                            "BMP/WEBP, 240-8000 px per side, aspect 1:8-8:1, " +
                            "at most 20 MB; videos 240-4096 px, at most " +
                            "100 MB.",
                    ),
                    reference_voice: zMediaUrl
                        .describe(
                            "Optional voice reference (WAV/MP3, 1-10 s, at " +
                                "most 15 MB) for this asset's character. " +
                                "Overrides a reference video's own audio.",
                        )
                        .optional(),
                }).strict(),
            )
            .min(1)
            .describe(
                "Reference assets: at least one reference_image or " +
                    "reference_video; images + videos at most 5 combined.",
            ),
    }).strict(),
    parameters: z.object({
        resolution: zResolution(["720P", "1080P"]).optional(),
        ratio: zWanRatio.optional(),
        duration: z
            .number()
            .int()
            .min(2)
            .max(15)
            .describe(
                "Length of the output in seconds: 2-15, or 2-10 when a " +
                    "reference_video is included. DashScope defaults to 5. " +
                    "Billed per second.",
            )
            .optional(),
        prompt_extend: zPromptExtend.optional(),
        watermark: zWatermark.optional(),
        seed: zSeed.optional(),
    }).strict().optional(),
}).strict();
