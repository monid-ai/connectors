import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";

// Input schema: Magic Hour public OpenAPI, 2026-10-09; concrete settings pin pricing.
export default defineEndpoint({
    meta: {
        displayName: "Magic Hour AI Image Upscaler",
        summary: "AI Image Upscaler",
        description:
            "AI Image Upscaler. Monid submits once, polls the corresponding project to completion and returns project metadata with expiring download URLs. Save outputs promptly. Upload local media through /v1/files/upload-urls and use its file_path; direct asset URLs are accepted where documented.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["image-generation"],
    },
    request: { method: "POST", path: "/v1/ai-image-upscaler" },
    input: {
        schema: {
            body: z
                .object({
                    name: z
                        .string()
                        .describe(
                            "Give your image a custom name for easy identification.",
                        )
                        .optional(),
                    scale_factor: z.union([z.literal(2), z.literal(4)]),
                    style: z
                        .object({
                            mode: z
                                .enum([
                                    "pro",
                                    "preserve",
                                    "balanced",
                                    "creative",
                                ])
                                .describe(
                                    'The upscaling mode. `"preserve"` uses the fast pro pipeline (1× credit multiplier). `"balanced"` and `"creative"` use the creative pipeline (2× credit multiplier). `"pro"` is deprecated and maps to `"preserve"`. Defaults to `"balanced"`.',
                                )
                                .optional(),
                            prompt: z
                                .string()
                                .describe(
                                    "A prompt to guide the final image. Only used when mode is `creative`.",
                                )
                                .optional(),
                        })
                        .strict()
                        .describe(
                            'Style settings for the upscale. Use `mode` (`"preserve"`, `"balanced"`, or `"creative"`). Defaults to `"balanced"`.',
                        )
                        .optional(),
                    assets: z
                        .object({
                            image_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "The image to upscale. This value is either\n- a direct URL to the video file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n. The maximum input image size is 4096x4096px.",
                                ),
                        })
                        .strict()
                        .describe("Provide the assets for upscaling"),
                })
                .strict(),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
        },
        estimate: ({ data }) => ({
            counts: {
                CREDIT:
                    25 *
                    (data.input.body.scale_factor === 4 ? 4 : 1) *
                    (["preserve", "pro"].includes(
                        data.input.body.style?.mode ?? "balanced",
                    )
                        ? 1
                        : 2),
            },
        }),
        evidence: ({ data, utils }) => ({
            counts: {
                CREDIT:
                    utils.json.optionalNum(data.output, "$.credits_charged") ??
                    0,
            },
        }),
    },
});
