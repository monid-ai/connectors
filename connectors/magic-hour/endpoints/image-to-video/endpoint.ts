import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";

// Input schema: Magic Hour public OpenAPI, 2026-10-09; concrete settings pin pricing.
export default defineEndpoint({
    meta: {
        displayName: "Magic Hour Image-to-Video",
        summary: "Image-to-Video",
        description:
            "Image-to-Video. This Monid route pins model=ltx-2.3, resolution=720p so pre-run pricing is deterministic. Monid submits once, polls the corresponding project to completion and returns project metadata with expiring download URLs. Save outputs promptly. Upload local media through /v1/files/upload-urls and use its file_path; direct asset URLs are accepted where documented.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["video-generation"],
    },
    request: { method: "POST", path: "/v1/image-to-video" },
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
                    end_seconds: z
                        .number()
                        .min(1)
                        .max(60)
                        .describe(
                            "The total duration of the output video in seconds. Supported durations depend on the chosen model:\n\n* **`gemini-omni-1.1`**: any integer from 3 to 10\n* **`kling-2.6`**: 5, 10\n* **`kling-3.0`**: any integer from 3 to 15\n* **`ltx-2.5`**: any integer from 1 to 60\n* **`minimax-h3`**: any integer from 1 to 30\n* **`seedance-1.5`**: any integer from 4 to 12\n* **`seedance-2.0`**: any integer from 4 to 15\n* **`seedance-2.0-mini`**: any integer from 4 to 15\n* **`seedance-2.5`**: any integer from 4 to 30\n* **`veo3.1`**: 4, 6, 8, 16, 24, 32, 40, 48, 56\n* **`veo3.1-lite`**: 4, 6, 8, 16, 24, 32, 40, 48, 56\n* **`wan-2.2`**: 3, 4, 5, 6, 7, 8, 9, 10, 15\n* **`wan-3.0`**: 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30\n",
                        ),
                    model: z.literal("ltx-2.3").default("ltx-2.3"),
                    resolution: z.literal("720p").default("720p"),
                    audio: z
                        .boolean()
                        .describe(
                            "Whether to include audio in the video. Defaults to `false` if not specified.\n\nAudio support varies by model:\n* **`gemini-omni-1.1`**: Not supported\n* **`kling-2.6`**: Not supported\n* **`kling-3.0`**: Toggle-able: audio adds extra credits when enabled\n* **`ltx-2.5`**: Toggle-able: no additional credits for audio\n* **`minimax-h3`**: Toggle-able: no additional credits for audio\n* **`seedance-1.5`**: Toggle-able: audio adds extra credits when enabled\n* **`seedance-2.0`**: Toggle-able: no additional credits for audio\n* **`seedance-2.0-mini`**: Toggle-able: no additional credits for audio\n* **`seedance-2.5`**: Toggle-able: no additional credits for audio\n* **`veo3.1`**: Toggle-able: audio adds extra credits when enabled\n* **`veo3.1-lite`**: Toggle-able: audio adds extra credits when enabled\n* **`wan-2.2`**: Not supported\n* **`wan-3.0`**: Toggle-able: no additional credits for audio\n",
                        )
                        .optional(),
                    style: z
                        .object({
                            prompt: z
                                .string()
                                .describe("The prompt used for the video.")
                                .optional(),
                        })
                        .strict()
                        .describe(
                            "Attributed used to dictate the style of the output",
                        )
                        .optional(),
                    assets: z
                        .object({
                            image_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "The path of the image file. This value is either\n- a direct URL to the video file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                ),
                            end_image_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "The image to use as the last frame of the video.\n\n* **`gemini-omni-1.1`**: Supports 360p, 720p, 1080p, 4k.\n* **`kling-2.6`**: Supports 1080p.\n* **`kling-3.0`**: Supports 720p, 1080p, 4k.\n* **`ltx-2.5`**: Supports 480p, 720p, 1080p.\n* **`minimax-h3`**: Not supported\n* **`seedance-1.5`**: Supports 480p, 720p, 1080p.\n* **`seedance-2.0`**: Supports 480p, 720p, 1080p, 4k.\n* **`seedance-2.0-mini`**: Supports 480p, 720p.\n* **`seedance-2.5`**: Supports 480p, 720p, 1080p.\n* **`veo3.1`**: Supports 720p, 1080p. Requires a duration of 8 seconds or less.\n* **`veo3.1-lite`**: Supports 720p, 1080p. Requires a duration of 8 seconds or less.\n* **`wan-2.2`**: Not supported\n* **`wan-3.0`**: Supports 480p, 720p, 1080p.\n",
                                )
                                .optional(),
                        })
                        .strict()
                        .describe("Provide the assets for image-to-video."),
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
            counts: { CREDIT: Math.ceil(data.input.body.end_seconds * 24) * 2 },
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
