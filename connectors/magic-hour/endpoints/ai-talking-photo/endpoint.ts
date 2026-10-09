import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";

// Input schema: Magic Hour public OpenAPI, 2026-10-09; concrete settings pin pricing.
export default defineEndpoint({
    meta: {
        displayName: "Magic Hour AI Talking Photo",
        summary: "AI Talking Photo",
        description:
            "AI Talking Photo. Monid submits once, polls the corresponding project to completion and returns project metadata with expiring download URLs. Save outputs promptly. Upload local media through /v1/files/upload-urls and use its file_path; direct asset URLs are accepted where documented.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["video-generation"],
    },
    request: { method: "POST", path: "/v1/ai-talking-photo" },
    input: {
        schema: {
            body: z
                .object({
                    name: z
                        .string()
                        .describe(
                            "Give your video a custom name for easy identification.",
                        )
                        .optional(),
                    start_seconds: z
                        .number()
                        .min(0)
                        .describe(
                            "The start time of the input audio in seconds. Maximum clip length depends on style.generation_mode: realistic 300s, prompted 45s.",
                        ),
                    end_seconds: z
                        .number()
                        .min(0.1)
                        .describe(
                            "The end time of the input audio in seconds. Maximum clip length depends on style.generation_mode: realistic 300s, prompted 45s.",
                        ),
                    assets: z
                        .object({
                            image_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "The source image to animate. This value is either\n- a direct URL to the media file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                ),
                            audio_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "The audio file to sync with the image. This value is either\n- a direct URL to the media file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                ),
                        })
                        .strict()
                        .describe(
                            "Provide the assets for creating a talking photo",
                        ),
                    style: z
                        .object({
                            generation_mode: z
                                .enum([
                                    "realistic",
                                    "prompted",
                                    "pro",
                                    "standard",
                                    "stable",
                                    "expressive",
                                ])
                                .describe(
                                    "Controls overall motion style.\n* `realistic` - Maintains likeness well, high quality, and reliable.\n* `prompted` - Slightly lower likeness; allows option to prompt scene.\n\n**Deprecated values (maintained for backward compatibility):**\n* `pro` - Deprecated: use `realistic`\n* `standard` - Deprecated: use `prompted`\n* `stable` - Deprecated: use `realistic`\n* `expressive` - Deprecated: use `prompted`",
                                )
                                .optional(),
                            prompt: z
                                .string()
                                .describe(
                                    "A text prompt to guide the generation. Only applicable when generation_mode is `prompted`.\nThis field is ignored for other modes.",
                                )
                                .optional(),
                        })
                        .strict()
                        .describe(
                            "Attributes used to dictate the style of the output",
                        )
                        .optional(),
                    max_resolution: z
                        .number()
                        .int()
                        .describe(
                            "Constrains the larger dimension (height or width) of the output video. Allows you to set a lower resolution than your plan's maximum if desired. The value is capped by your plan's max resolution.",
                        )
                        .optional(),
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
                CREDIT: Math.round(
                    (data.input.body.end_seconds -
                        data.input.body.start_seconds) *
                        24 *
                        (["prompted", "standard", "expressive"].includes(
                            data.input.body.style?.generation_mode ??
                                "realistic",
                        )
                            ? 1
                            : 2),
                ),
            },
        }),
        evidence: ({ data, utils }) => ({
            counts: {
                CREDIT:
                    utils.json.optionalGet(data.output, "$.status") ===
                    "complete"
                        ? (utils.json.optionalNum(
                              data.output,
                              "$.credits_charged",
                          ) ?? 0)
                        : 0,
            },
        }),
    },
});
