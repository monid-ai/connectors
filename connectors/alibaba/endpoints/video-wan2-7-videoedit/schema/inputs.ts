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
 * `wan2.7-videoedit` — the faithful vendor mirror (D25). Live docs
 * https://www.alibabacloud.com/help/en/model-studio/wan-video-editing-api-reference,
 * read 2026-09-16. `duration` omitted keeps the source clip's length
 * (DashScope's `0` sentinel is not mirrored — omit the field instead).
 */
export const zWan27VideoeditBody = z.object({
    input: z.object({
        prompt: z
            .string()
            .min(1)
            .max(5000)
            .describe(
                "Editing instruction (max 5,000 characters; longer text " +
                    'is truncated upstream), e.g. "Convert the entire ' +
                    'scene to a claymation style".',
            )
            .optional(),
        negative_prompt: zNegativePrompt.optional(),
        media: z
            .array(
                z.object({
                    type: z
                        .enum(["video", "reference_image"])
                        .describe(
                            "video: the clip to edit (MP4/MOV, 2-10 s, " +
                                "240-4096 px per side, at most 100 MB; " +
                                "exactly one). reference_image: an editing " +
                                "reference (JPEG/PNG/BMP/WEBP, 240-8000 px, " +
                                "at most 20 MB; up to four).",
                        ),
                    url: zMediaUrl.describe(
                        "Public https:// URL of the asset.",
                    ),
                }).strict(),
            )
            .min(1)
            .describe("Exactly one video plus up to four reference images."),
    }).strict(),
    parameters: z.object({
        resolution: zResolution(["720P", "1080P"]).optional(),
        ratio: zWanRatio
            .describe(
                "Aspect ratio of the output. Omit to follow the input " +
                    "video's ratio.",
            )
            .optional(),
        duration: z
            .number()
            .int()
            .min(2)
            .max(10)
            .describe(
                "Truncate the output to this many seconds (2-10). Omit to " +
                    "keep the source clip's length — the estimate then " +
                    "holds a 10-second output and settles on actual " +
                    "seconds.",
            )
            .optional(),
        audio_setting: z
            .enum(["auto", "origin"])
            .describe(
                "auto (the DashScope default): the model decides the audio " +
                    "from the prompt and may regenerate it. origin: keep " +
                    "the input video's original audio.",
            )
            .optional(),
        prompt_extend: zPromptExtend.optional(),
        watermark: zWatermark.optional(),
        seed: zSeed.optional(),
    }).strict().optional(),
}).strict();
