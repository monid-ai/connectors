// Input schema transcribed from Magic Hour public OpenAPI (2026-10-09).
import { defineEndpoint, UsageModelKind, Unit } from "@shared/core";
import { z } from "zod";

export default defineEndpoint({
    meta: {
        displayName: "Magic Hour AI Voice Cloner",
        summary: "AI Voice Cloner",
        description:
            "Clone a voice from an audio sample and generate speech. \n* Each character costs 0.1 credits. \n* The cost is rounded up to the nearest whole number Monid waits for the project to finish. Download URLs expire; save the result promptly.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["audio-generation"],
    },
    endpoint: "/v1/ai-voice-cloner",
    request: { method: "POST", path: "/v1/ai-voice-cloner" },
    input: {
        schema: {
            body: z
                .object({
                    name: z
                        .string()
                        .describe(
                            "Give your audio a custom name for easy identification.",
                        )
                        .optional(),
                    assets: z
                        .object({
                            audio_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "The audio used to clone the voice. This value is either\n- a direct URL to the video file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                ),
                        })
                        .strict()
                        .describe("Provide the assets for voice cloning."),
                    style: z
                        .object({
                            prompt: z
                                .string()
                                .min(1)
                                .max(1000)
                                .describe(
                                    "Text used to generate speech from the cloned voice. The character limit is 1000 characters.",
                                ),
                        })
                        .strict(),
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
                CREDIT: Math.ceil(data.input.body.style.prompt.length * 0.1),
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
