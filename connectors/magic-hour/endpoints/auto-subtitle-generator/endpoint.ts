// Input schema transcribed from Magic Hour public OpenAPI (2026-10-09).
import { defineEndpoint, UsageModelKind, Unit } from "@shared/core";
import { z } from "zod";

export default defineEndpoint({
    meta: {
        displayName: "Magic Hour Auto Subtitle Generator",
        summary: "Auto Subtitle Generator",
        description:
            "Automatically generate subtitles for your video in multiple languages. Monid waits for the project to finish. Download URLs expire; save the result promptly.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["video-generation"],
    },
    endpoint: "/v1/auto-subtitle-generator",
    request: { method: "POST", path: "/v1/auto-subtitle-generator" },
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
                            "Start time of your clip (seconds). Must be ≥ 0.",
                        ),
                    end_seconds: z
                        .number()
                        .min(0.1)
                        .describe(
                            "End time of your clip (seconds). Must be greater than start_seconds.",
                        ),
                    assets: z
                        .object({
                            video_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "This is the video used to add subtitles. This value is either\n- a direct URL to the video file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                ),
                        })
                        .strict()
                        .describe(
                            "Provide the assets for auto subtitle generator",
                        ),
                    style: z
                        .object({
                            template: z
                                .enum([
                                    "karaoke",
                                    "cinematic",
                                    "minimalist",
                                    "highlight",
                                ])
                                .describe(
                                    "Preset subtitle templates. Please visit https://magichour.ai/create/auto-subtitle-generator to see the style of the existing templates.",
                                )
                                .optional(),
                            custom_config: z
                                .object({
                                    font: z
                                        .string()
                                        .describe(
                                            "Font name from Google Fonts. Not all fonts support all languages or character sets. \nWe recommend verifying language support and appearance directly on https://fonts.google.com before use.",
                                        )
                                        .optional(),
                                    font_size: z
                                        .number()
                                        .describe(
                                            "Font size in pixels. If not provided, the font size is automatically calculated based on the video resolution.",
                                        )
                                        .optional(),
                                    font_style: z
                                        .string()
                                        .describe(
                                            "Font style (e.g., normal, italic, bold)",
                                        )
                                        .optional(),
                                    text_color: z
                                        .string()
                                        .describe(
                                            "Primary text color in hex format",
                                        )
                                        .optional(),
                                    highlighted_text_color: z
                                        .string()
                                        .describe(
                                            "Color used to highlight the current spoken text",
                                        )
                                        .optional(),
                                    stroke_color: z
                                        .string()
                                        .describe(
                                            "Stroke (outline) color of the text",
                                        )
                                        .optional(),
                                    stroke_width: z
                                        .number()
                                        .describe(
                                            "Width of the text stroke in pixels. If `stroke_color` is provided, but `stroke_width` is not, the `stroke_width` will be calculated automatically based on the font size.",
                                        )
                                        .optional(),
                                    vertical_position: z
                                        .string()
                                        .describe(
                                            "Vertical alignment of the text (e.g., top, center, bottom)",
                                        )
                                        .optional(),
                                    horizontal_position: z
                                        .string()
                                        .describe(
                                            "Horizontal alignment of the text (e.g., left, center, right)",
                                        )
                                        .optional(),
                                })
                                .strict()
                                .describe("Custom subtitle configuration.")
                                .optional(),
                        })
                        .strict()
                        .describe(
                            "Style of the subtitle. At least one of `.style.template` or `.style.custom_config` must be provided. \n* If only `.style.template` is provided, default values for the template will be used.\n* If both are provided, the fields in `.style.custom_config` will be used to overwrite the fields in `.style.template`.\n* If only `.style.custom_config` is provided, then all fields in `.style.custom_config` will be used.\n\nTo use custom config only, the following `custom_config` params are required:\n* `.style.custom_config.font`\n* `.style.custom_config.text_color`\n* `.style.custom_config.vertical_position`\n* `.style.custom_config.horizontal_position`\n",
                        ),
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
                    Math.ceil(
                        30 *
                            (data.input.body.end_seconds -
                                data.input.body.start_seconds),
                    ) * 0.2,
                ),
            },
        }),
        evidence: ({ data, utils }) => ({
            counts: {
                CREDIT:
                    utils.json.optionalGet(data.output, "$.status") === "complete"
                        ? utils.json.optionalNum(data.output, "$.credits_charged") ?? 0
                        : 0,
            },
        }),
    },
});
