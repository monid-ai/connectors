import { z } from "zod";
import {
    zImageMessages,
    zSeed,
    zWatermark,
} from "../../../schema/dashscope.ts";

/**
 * `POST /api/v1/services/aigc/multimodal-generation/generation` body for
 * `wan2.7-image-pro` — the faithful vendor mirror (D25): DashScope's
 * `{input: {messages}, parameters}` envelope, `model` injected at the wire
 * (D2). Live docs https://www.alibabacloud.com/help/en/model-studio/wan-image-generation-and-editing-api-reference,
 * read 2026-09-16.
 */
export const zWan27ImageProBody = z.object({
    input: z.object({
        messages: zImageMessages(
            9,
            "Text prompt (max 5,000 characters; longer text is truncated " +
                "upstream) — the image description, editing instruction, " +
                "or image-set storyline. This model has no " +
                "negative_prompt: describe exclusions in the prompt.",
            "Public https:// URL of an input image (JPEG/PNG/BMP/WEBP, at " +
                "most 20 MB, 240-8000 px per side) for editing or " +
                "multi-image reference. Input images are free; the output " +
                "aspect ratio follows the last one.",
        ),
    }).strict(),
    parameters: z.object({
        bbox_list: z
            .array(z.array(z.array(z.number().int()).length(4)).max(2))
            .describe(
                "Interactive editing: per input image, 0-2 bounding boxes " +
                    "[x1, y1, x2, y2] in absolute pixels of that image. The " +
                    "outer list length must match the input image count; " +
                    "pass [] for images without a box.",
            )
            .optional(),
        enable_sequential: z
            .boolean()
            .describe(
                "Image-set mode: generate multiple story-coherent images " +
                    "from one request. DashScope defaults to false. " +
                    "Disables thinking_mode and color_palette.",
            )
            .optional(),
        size: z
            .union([z.enum(["1K", "2K", "4K"]), z.string().regex(/^\d+\*\d+$/)])
            .describe(
                'Output resolution: "1K", "2K" (the DashScope default) or "4K" — or an explicit "width*height" (768*768 up to 4096*4096 total pixels, aspect ratio 1:8 to 8:1). 4K applies to pure text-to-image only (no input images, no image set). Price does not vary by size.',
            )
            .optional(),
        n: z
            .number()
            .int()
            .min(1)
            .max(12)
            .describe(
                "Number of output images: 1-4 normally (DashScope defaults " +
                    "to 1); in image-set mode the MAXIMUM, 1-12 (DashScope " +
                    "defaults to 12) — the model decides the actual count. " +
                    "Drives the per-image charge and the hold.",
            )
            .optional(),
        thinking_mode: z
            .boolean()
            .describe(
                "Enhanced reasoning for better quality (DashScope defaults " +
                    "to true; slower). Effective only for text-to-image " +
                    "outside image-set mode.",
            )
            .optional(),
        color_palette: z
            .array(
                z.object({
                    hex: z
                        .string()
                        .regex(/^#[0-9A-Fa-f]{6}$/)
                        .describe("Hex color, e.g. #C2D1E6."),
                    ratio: z
                        .string()
                        .regex(/^\d+(\.\d{1,2})?%$/)
                        .describe(
                            'Share of the palette, e.g. "23.51%". All ' +
                                "ratios must sum to 100.00%.",
                        ),
                }).strict(),
            )
            .min(3)
            .max(10)
            .describe(
                "Custom color scheme (3-10 colors; 8 recommended). Not " +
                    "available in image-set mode.",
            )
            .optional(),
        watermark: zWatermark.optional(),
        seed: zSeed.optional(),
    }).strict().optional(),
}).strict();
