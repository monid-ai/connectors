import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";

// Input schema: Magic Hour public OpenAPI, 2026-10-09; concrete settings pin pricing.
export default defineEndpoint({
    meta: {
        displayName: "Magic Hour AI Video Editor",
        summary: "AI Video Editor",
        description:
            "AI Video Editor. This Monid route pins model=ltx-2.3, resolution=720p so pre-run pricing is deterministic. Monid submits once, polls the corresponding project to completion and returns project metadata with expiring download URLs. Save outputs promptly. Upload local media through /v1/files/upload-urls and use its file_path; direct asset URLs are accepted where documented.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["video-generation"],
    },
    request: { method: "POST", path: "/v1/ai-video-editor" },
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
                            "End time of your clip in seconds. Must be greater than `start_seconds`. Minimum duration depends on model: `gemini-omni-1.1`: 3s, LTX 2.5: 0.5s. Maximum duration depends on model: `gemini-omni-1.1`: 10s, LTX 2.5: 20s.",
                        ),
                    model: z.literal("ltx-2.3").default("ltx-2.3"),
                    resolution: z.literal("720p").default("720p"),
                    style: z
                        .object({
                            prompt: z
                                .string()
                                .min(1)
                                .describe("The prompt used to edit the video."),
                        })
                        .strict(),
                    assets: z
                        .object({
                            video_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "The video to edit. This value is either\n- a direct URL to the video file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                ),
                        })
                        .strict()
                        .describe("Provide the assets for video editing."),
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
                        (data.input.body.end_seconds -
                            (data.input.body.start_seconds ?? 0)) *
                            24,
                    ) * 1.5,
                ),
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
