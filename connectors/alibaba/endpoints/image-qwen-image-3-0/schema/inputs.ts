import { z } from "zod";
import {
    zImageMessages,
    zPromptExtend,
    zSeed,
    zWatermark,
} from "../../../schema/dashscope.ts";

/**
 * `POST /api/v1/services/aigc/multimodal-generation/generation` body for
 * `qwen-image-3.0` — the faithful vendor mirror (D25): DashScope's
 * `{input: {messages}, parameters}` envelope, `model` injected at the wire
 * (D2). Live docs https://www.alibabacloud.com/help/en/model-studio/qwen-image-generation-and-editing-api-reference,
 * read 2026-09-16. `size` is optional upstream (the model recommends one)
 * but REQUIRED at the binding so the doc reads like its pro sibling; unlike
 * the pro model, the price does not vary by size.
 */
export const zQwenImage30Body = z.object({
    input: z.object({
        messages: zImageMessages(
            3,
            "The positive prompt: image content, style, composition — or " +
                "the editing instruction when input images are provided. " +
                "Recommended maximum 4,500 tokens.",
            "Public https:// URL of an input image (JPG/PNG/BMP/TIFF/WEBP/" +
                "GIF, at most 10 MB, best at 384-2048 px per side). Order " +
                "defines the reference order; each input image bills " +
                "US$0.003.",
        ),
    }).strict(),
    parameters: z.object({
        size: z
            .string()
            .regex(/^\d+\*\d+$/)
            .describe(
                'Output resolution "width*height". Total pixels 512*512 ' +
                    "to 2048*2048, aspect ratio 1:8 to 8:1. The price does " +
                    "not vary by size (DashScope lists a 1K and a 2K row " +
                    "for this model at the same rate).",
            )
            .optional(),
        n: z
            .number()
            .int()
            .min(1)
            .max(6)
            .describe(
                "Number of output images (1-6). DashScope defaults to 1. " +
                    "Drives the per-image charge.",
            )
            .optional(),
        negative_prompt: z
            .string()
            .describe("Content to exclude from the image.")
            .optional(),
        prompt_extend: zPromptExtend.optional(),
        prompt_extend_mode: z
            .enum(["direct", "agent"])
            .describe(
                "direct (the DashScope default) suits most cases and works " +
                    "for both generation and editing; agent rewrites more " +
                    "thoroughly but is text-to-image ONLY.",
            )
            .optional(),
        enable_thinking: z
            .boolean()
            .describe(
                "Thinking mode (DashScope defaults to true): better " +
                    "quality, slower. Requires prompt_extend.",
            )
            .optional(),
        watermark: zWatermark.optional(),
        seed: zSeed.optional(),
    }).strict().optional(),
}).strict();
