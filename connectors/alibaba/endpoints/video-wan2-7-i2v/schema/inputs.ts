import { z } from "zod";
import {
    zMediaUrl,
    zNegativePrompt,
    zPromptExtend,
    zResolution,
    zSeed,
    zWatermark,
} from "../../../schema/dashscope.ts";

/**
 * `POST /api/v1/services/aigc/video-generation/video-synthesis` body for
 * `wan2.7-i2v` — the faithful vendor mirror (D25). Live docs
 * https://www.alibabacloud.com/help/en/model-studio/image-to-video-general-api-reference,
 * read 2026-09-16. No `ratio` — the output follows the input material.
 */
export const zWan27I2vBody = z.object({
    input: z.object({
        prompt: z
            .string()
            .min(1)
            .max(5000)
            .describe(
                "Text prompt describing the desired motion and style (max " +
                    "5,000 characters; longer text is truncated upstream).",
            )
            .optional(),
        negative_prompt: zNegativePrompt.optional(),
        media: z
            .array(
                z.object({
                    type: z
                        .enum([
                            "first_frame",
                            "last_frame",
                            "driving_audio",
                            "first_clip",
                        ])
                        .describe(
                            "first_frame: the opening image. last_frame: " +
                                "the closing image. driving_audio: WAV/MP3 " +
                                "2-30 s for lip-sync and timing. " +
                                "first_clip: an MP4/MOV clip (2-10 s) to " +
                                "continue — duration then bounds the " +
                                "TOTAL output length. Each type at most " +
                                "once.",
                        ),
                    url: zMediaUrl.describe(
                        "Public https:// URL of the asset: images JPEG/PNG/" +
                            "BMP/WEBP, 240-8000 px per side, aspect 1:8-8:1, " +
                            "at most 20 MB; audio at most 15 MB; clips " +
                            "240-4096 px, at most 100 MB.",
                    ),
                }).strict(),
            )
            .min(1)
            .describe(
                "Task assets. Valid combinations: first_frame " +
                    "(+driving_audio) (+last_frame), or first_clip " +
                    "(+last_frame).",
            ),
    }).strict(),
    parameters: z.object({
        resolution: zResolution(["720P", "1080P"]).optional(),
        duration: z
            .number()
            .int()
            .min(2)
            .max(15)
            .describe(
                "Length of the output in seconds (2-15); with a " +
                    "first_clip this bounds the TOTAL output including the " +
                    "clip. DashScope defaults to 5. Billed per second.",
            )
            .optional(),
        prompt_extend: zPromptExtend.optional(),
        watermark: zWatermark.optional(),
        seed: zSeed.optional(),
    }).strict().optional(),
}).strict();
