import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";

// Input schema: Magic Hour public OpenAPI, 2026-10-09; concrete settings pin pricing.
export default defineEndpoint({
    meta: {
        displayName: "Magic Hour AI Video Translator",
        summary: "AI Video Translator",
        description:
            "AI Video Translator. This Monid route pins resolution=720p so pre-run pricing is deterministic. Monid submits once, polls the corresponding project to completion and returns project metadata with expiring download URLs. Save outputs promptly. Upload local media through /v1/files/upload-urls and use its file_path; direct asset URLs are accepted where documented.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["video-generation"],
    },
    request: { method: "POST", path: "/v1/ai-video-translator" },
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
                            "End time of your clip (seconds). Must be greater than start_seconds. The clip must be 1-30 seconds long.",
                        ),
                    target_language: z
                        .enum([
                            "English",
                            "Chinese (Simplified)",
                            "Hindi",
                            "Spanish",
                            "Arabic",
                            "French",
                            "Afrikaans",
                            "Bengali",
                            "Bulgarian",
                            "Catalan",
                            "Croatian",
                            "Czech",
                            "Danish",
                            "Dutch",
                            "Estonian",
                            "Finnish",
                            "German",
                            "Greek",
                            "Gujarati",
                            "Hebrew",
                            "Hungarian",
                            "Indonesian",
                            "Italian",
                            "Japanese",
                            "Kannada",
                            "Kazakh",
                            "Korean",
                            "Latvian",
                            "Lithuanian",
                            "Malay",
                            "Malayalam",
                            "Marathi",
                            "Norwegian",
                            "Persian",
                            "Polish",
                            "Portuguese",
                            "Punjabi",
                            "Romanian",
                            "Russian",
                            "Serbian",
                            "Slovak",
                            "Slovenian",
                            "Swahili",
                            "Swedish",
                            "Tamil",
                            "Telugu",
                            "Thai",
                            "Chinese (Traditional)",
                            "Turkish",
                            "Ukrainian",
                            "Urdu",
                            "Vietnamese",
                            "Welsh",
                        ])
                        .describe(
                            "Language to translate the video's speech into.",
                        ),
                    resolution: z.literal("720p").default("720p"),
                    assets: z
                        .object({
                            video_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "Source video containing the speech to translate. This value is either\n- a direct URL to the video file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                ),
                        })
                        .strict()
                        .describe("Source video for the translation job."),
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
                        data.input.body.end_seconds -
                            (data.input.body.start_seconds ?? 0),
                    ) * 72,
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
