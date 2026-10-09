import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";

// Input schema: Magic Hour public OpenAPI, 2026-10-09; concrete settings pin pricing.
export default defineEndpoint({
    meta: {
        displayName: "Magic Hour Lip Sync",
        summary: "Lip Sync",
        description:
            "Lip Sync. Monid submits once, polls the corresponding project to completion and returns project metadata with expiring download URLs. Save outputs promptly. Upload local media through /v1/files/upload-urls and use its file_path; direct asset URLs are accepted where documented.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["video-generation"],
    },
    request: { method: "POST", path: "/v1/lip-sync" },
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
                    max_fps_limit: z
                        .number()
                        .min(1)
                        .describe(
                            "Monid supplies 30 FPS when omitted so the request matches the credit estimate. Defines the maximum FPS (frames per second) for the output video. If the input video's FPS is lower than this limit, the output video will retain the input FPS. This is useful for reducing unnecessary frame usage in scenarios where high FPS is not required.",
                        )
                        .default(30),
                    assets: z
                        .object({
                            audio_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "The path of the audio file. This value is either\n- a direct URL to the media file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                ),
                            video_source: z
                                .enum(["file", "youtube"])
                                .describe("Choose your video source."),
                            video_file_path: z
                                .string()
                                .describe(
                                    "Your video file. Required if `video_source` is `file`. This value is either\n- a direct URL to the media file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                )
                                .optional(),
                            youtube_url: z
                                .string()
                                .describe(
                                    "YouTube URL (required if `video_source` is `youtube`).",
                                )
                                .optional(),
                        })
                        .strict()
                        .describe(
                            "Provide the assets for lip-sync. For video, The `video_source` field determines whether `video_file_path` or `youtube_url` field is used",
                        ),
                    style: z
                        .object({
                            generation_mode: z
                                .enum(["lite", "standard", "pro"])
                                .describe(
                                    "A specific version of our lip sync system, optimized for different needs.\n* `lite` -  Fast lip sync - best for simple videos. Costs 1 credit per frame of video.\n* `standard` -  Natural, accurate lip sync - best for most creators. Requires visible mouth movement in the opening seconds of the input video. Costs 1 credit per frame of video.\n* `pro` -  Premium fidelity with enhanced detail - best for professionals. Requires visible mouth movement in the opening seconds of the input video. Costs 2 credits per frame of video.\n\nIf your source is a still image, including a still image saved as a static video, use [AI Talking Photo](https://docs.magichour.ai/api-reference/video-projects/ai-talking-photo) with the original image and your audio instead.\n\nNote: `pro` is only available for users on Creator, Pro, and Business tiers.\n              ",
                                )
                                .optional(),
                        })
                        .strict()
                        .describe(
                            "Attributes used to dictate the style of the output",
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
                CREDIT:
                    Math.ceil(
                        data.input.body.max_fps_limit *
                            (data.input.body.end_seconds -
                                data.input.body.start_seconds),
                    ) *
                    (data.input.body.style?.generation_mode === "pro" ? 2 : 1),
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
