import { z } from "zod";
import {
    zMediaUrl,
    zNegativePrompt,
    zPromptExtend,
    zResolution,
    zWatermark,
} from "../../../schema/dashscope.ts";

/**
 * `POST /api/v1/services/aigc/video-generation/video-synthesis` body for
 * `wan3.0-video` — the faithful vendor mirror (D25): DashScope's
 * `{input, parameters}` envelope, `model` injected at the wire (D2). Live
 * docs https://www.alibabacloud.com/help/en/model-studio/wan3-video-generation-api-reference,
 * read 2026-09-16. `input.prompt` or `input.media` must be present — the
 * vendor's own rule, expressed as the union. `duration: "auto"` is OUR name
 * for DashScope's `-1` smart-duration sentinel (translated in toRequest).
 */
const zWan3Input = z.object({
    prompt: z
        .string()
        .min(1)
        .max(20000)
        .describe(
            "Text prompt (max 20,000 characters; longer text is truncated " +
                "upstream). In reference mode refer to media by ordinal — " +
                '"Image 1", "Video 1", "Audio 1" — numbered per type in ' +
                "media[] order. Either prompt or media is required.",
        )
        .optional(),
    media: z
        .array(
            z.object({
                type: z
                    .enum([
                        "first_frame",
                        "last_frame",
                        "reference_image",
                        "reference_video",
                        "reference_audio",
                        "file",
                        "link",
                    ])
                    .describe(
                        "first_frame / last_frame pin exact frames (max 1 " +
                            "each). reference_image (max 10), " +
                            "reference_video / reference_audio (max 5 " +
                            "each, clips 1-15 s, 15 s combined), file " +
                            "(docx/xlsx/pptx/pdf/txt/md, max 1, up to 50 " +
                            "pages) and link (max 1) supply reference " +
                            "material.",
                    ),
                url: zMediaUrl.describe(
                    "Public https:// URL of the asset: images JPEG/PNG/BMP/" +
                        "WEBP, 240-8000 px per side, at most 20 MB; " +
                        "videos MP4/MOV, 240-4096 px, at least 16 fps, at " +
                        "most 100 MB; audio WAV/MP3, at most 15 MB; files " +
                        "at most 100 MB.",
                ),
            }).strict(),
        )
        .min(1)
        .describe(
            "Reference material. Either prompt or media is required.",
        )
        .optional(),
    negative_prompt: zNegativePrompt.optional(),
}).strict();

export const zWan30Body = z.object({
    input: z.union([
        zWan3Input.required({ prompt: true }),
        zWan3Input.required({ media: true }),
    ]).describe("The prompt and/or the reference material."),
    parameters: z.object({
        resolution: zResolution(["480P", "720P", "1080P"]).optional(),
        ratio: z
            .enum(["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16"])
            .describe(
                'Aspect ratio. "adaptive" (the DashScope default) picks ' +
                    "the best fit from the inputs and intent.",
            )
            .optional(),
        duration: z
            .union([z.number().int().min(2).max(30), z.literal("auto")])
            .describe(
                'Length of the output in seconds (2-30), or "auto" to let ' +
                    "the model pick the length from the prompt and inputs " +
                    "(DashScope's smart-duration mode). With a video " +
                    "input, input + output seconds may not exceed 30. " +
                    'DashScope defaults to 5. Billed per second; "auto" ' +
                    "holds the price of a 30-second output up front.",
            )
            .optional(),
        audio: z
            .boolean()
            .describe(
                "Include an audio track. DashScope defaults to true. No " +
                    "price impact.",
            )
            .optional(),
        seed: z
            .number()
            .int()
            .min(-1)
            .max(2147483647)
            .describe(
                "Random seed for reproducibility (0-2147483647; -1 or " +
                    "omitted = random).",
            )
            .optional(),
        prompt_extend: zPromptExtend.optional(),
        watermark: zWatermark.optional(),
    }).strict().optional(),
}).strict();
