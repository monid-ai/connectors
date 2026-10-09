import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";

// Input schema: Magic Hour public OpenAPI, 2026-10-09; concrete settings pin pricing.
export default defineEndpoint({
    meta: {
        displayName: "Magic Hour Character Replace",
        summary: "Character Replace",
        description:
            "Character Replace. This Monid route pins model=wan-animate, resolution=720p so pre-run pricing is deterministic. Monid submits once, polls the corresponding project to completion and returns project metadata with expiring download URLs. Save outputs promptly. Upload local media through /v1/files/upload-urls and use its file_path; direct asset URLs are accepted where documented.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["video-generation"],
    },
    request: { method: "POST", path: "/v1/character-replace" },
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
                        )
                        .optional(),
                    end_seconds: z
                        .number()
                        .min(0.1)
                        .describe(
                            "End time of your clip (seconds). Must be greater than start_seconds.",
                        ),
                    model: z.literal("wan-animate").default("wan-animate"),
                    resolution: z.literal("720p").default("720p"),
                    assets: z
                        .object({
                            video_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "Source video containing the subject to replace or animate. This value is either\n- a direct URL to the video file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                ),
                            image_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "Reference character image used as the replacement or animation target. This value is either\n- a direct URL to the video file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                ),
                        })
                        .strict()
                        .describe(
                            "Source video and reference character image for the job.",
                        ),
                    style: z
                        .object({
                            mode: z
                                .enum(["replace", "animate"])
                                .describe(
                                    "Processing mode. `replace` swaps the detected subject with your reference character. `animate` transfers motion from the video onto your character image.",
                                )
                                .optional(),
                            selection_mode: z
                                .enum(["auto", "point"])
                                .describe(
                                    "How to locate the subject in the source video. `auto` detects a person automatically. `point` uses your `points` to mark the subject and is supported by `wan-animate`. Defaults to `auto`.",
                                )
                                .optional(),
                            points: z
                                .array(
                                    z
                                        .object({
                                            position_x: z
                                                .number()
                                                .int()
                                                .min(0)
                                                .describe(
                                                    "Horizontal pixel coordinate in the source video frame at `time_seconds`, measured from the left edge.",
                                                ),
                                            position_y: z
                                                .number()
                                                .int()
                                                .min(0)
                                                .describe(
                                                    "Vertical pixel coordinate in the source video frame at `time_seconds`, measured from the top edge.",
                                                ),
                                            time_seconds: z
                                                .number()
                                                .min(0)
                                                .describe(
                                                    "Timestamp on the source video timeline in seconds. Uses the same clock as `start_seconds` and `end_seconds`.",
                                                ),
                                        })
                                        .strict(),
                                )
                                .describe(
                                    "On-frame markers for manual subject selection. Required when `selection_mode` is `point`. Ignored when `selection_mode` is `auto` or omitted. Rejected for models without subject selection (supported by `wan-animate`).",
                                )
                                .optional(),
                        })
                        .strict()
                        .describe(
                            "Optional style controls for replace vs animate mode and subject selection.",
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
                        (data.input.body.end_seconds -
                            (data.input.body.start_seconds ?? 0)) *
                            24,
                    ) * 4,
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
