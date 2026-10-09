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
 * `wan2.7-t2v` — the faithful vendor mirror (D25): DashScope's `{input,
 * parameters}` envelope, `model` injected at the wire (D2). Live docs
 * https://www.alibabacloud.com/help/en/model-studio/text-to-video-api-reference,
 * read 2026-09-16. `shot_type` is a legacy 2.6 knob with no effect on 2.7
 * and is not mirrored.
 */
export const zWan27T2vBody = z.object({
    input: z.object({
        prompt: z
            .string()
            .min(1)
            .max(5000)
            .describe(
                "Text prompt describing the video content and style (max " +
                    "5,000 characters; longer text is truncated upstream). " +
                    "Multi-shot narratives can be described with " +
                    "timestamps in the prompt.",
            ),
        negative_prompt: zNegativePrompt.optional(),
        audio_url: zMediaUrl
            .describe(
                "Public https:// URL of a driving audio file (WAV/MP3, " +
                    "2-30 s, at most 15 MB) for lip-synced speech or song; " +
                    "longer audio is cut to the duration, shorter audio " +
                    "leaves the tail silent. Without it the model " +
                    "generates matching music or sound effects.",
            )
            .optional(),
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
                "Length of the output in seconds (2-15). DashScope " +
                    "defaults to 5. Billed per second.",
            )
            .optional(),
        prompt_extend: zPromptExtend.optional(),
        watermark: zWatermark.optional(),
        seed: zSeed.optional(),
    }).strict().optional(),
}).strict();
