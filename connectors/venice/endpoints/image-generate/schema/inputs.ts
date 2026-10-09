import { z } from "zod";

/**
 * `POST /image/generate` request body — mirrors the Venice-native image
 * request (https://docs.venice.ai). Optionality only (D25).
 *
 * `model` is enumerated to the flat-priced models this connector carries
 * (one price per image, independent of resolution and quality — see
 * endpoint.ts). Not mirrored: `return_binary` (the engine settles JSON; a
 * binary body would arrive as an undecodable string), `inpaint`
 * (deprecated upstream) and `style_references` (a per-model surcharge
 * this rate card does not carry).
 */
export const zImageModel = z.enum([
    "venice-sd35",
    "lustify-sdxl",
    "lustify-v7",
    "lustify-v8",
    "wai-Illustrious",
    "qwen-image",
    "flux-2-pro",
    "hunyuan-image-v3",
    "flux-2-max",
]);

export const zImageGenerateBody = z.object({
    model: zImageModel.describe(
        "Image model. Private (Venice-hosted): venice-sd35, lustify-sdxl, " +
            "lustify-v7, lustify-v8 (uncensored), wai-Illustrious (anime), " +
            "hunyuan-image-v3. Anonymized proxies: qwen-image (highest " +
            "quality per dollar), flux-2-pro, flux-2-max.",
    ),
    prompt: z.string().min(1).max(7500).describe(
        "What to generate. Per-model limits: 1500 chars on the SDXL/SD3.5 " +
            "family, 2048 on qwen-image, 3000 elsewhere.",
    ),
    negative_prompt: z.string().max(7500).optional().describe(
        "What to avoid in the image (models that support it).",
    ),
    width: z.number().int().min(1).max(1280).optional().describe(
        "Width in px (vendor default 1024, max 1280).",
    ),
    height: z.number().int().min(1).max(1280).optional().describe(
        "Height in px (vendor default 1024, max 1280).",
    ),
    aspect_ratio: z.string().optional().describe(
        "Aspect ratio such as `1:1`, `16:9`, `9:16` on models that take " +
            "ratios instead of pixel sizes.",
    ),
    variants: z.number().int().min(1).max(4).optional().describe(
        "How many images to generate (1-4, vendor default 1). Each is " +
            "billed.",
    ),
    format: z.enum(["webp", "png", "jpeg"]).optional().describe(
        "Image encoding (vendor default webp).",
    ),
    safe_mode: z.boolean().optional().describe(
        "Blur adult content (vendor default true). Set false for " +
            "uncensored output.",
    ),
    hide_watermark: z.boolean().optional().describe(
        "Omit the Venice watermark (vendor default false).",
    ),
    seed: z.number().int().min(-999999999).max(999999999).optional()
        .describe("Seed for reproducible results."),
    steps: z.number().int().min(1).max(50).optional().describe(
        "Inference steps (per-model max; 30 on venice-sd35).",
    ),
    cfg_scale: z.number().positive().max(20).optional().describe(
        "Prompt adherence; higher is more literal.",
    ),
    style_preset: z.string().optional().describe(
        "A Venice style preset name (GET /image/styles).",
    ),
    lora_strength: z.number().int().min(0).max(100).optional(),
    embed_exif_metadata: z.boolean().optional().describe(
        "Embed the generation parameters in EXIF.",
    ),
});
