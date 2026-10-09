// Input schema transcribed from Magic Hour public OpenAPI (2026-10-09).
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";

export default defineEndpoint({
    meta: {
        displayName: "Magic Hour AI Headshot Generator",
        summary: "AI Headshot Generator",
        description:
            "Create an AI headshot. Each headshot costs 50 credits. Monid waits for the project to finish. Download URLs expire; save the result promptly.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["image-generation"],
    },
    endpoint: "/v1/ai-headshot-generator",
    request: { method: "POST", path: "/v1/ai-headshot-generator" },
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
                    style: z
                        .object({
                            prompt: z
                                .string()
                                .describe(
                                    "Prompt used to guide the style of your headshot. We recommend omitting the prompt unless you want to customize your headshot. You can visit [AI headshot generator](https://magichour.ai/create/ai-headshot-generator) to view an example of a good prompt used for our 'Professional' style.",
                                )
                                .optional(),
                        })
                        .strict()
                        .optional(),
                    assets: z
                        .object({
                            image_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "The image used to generate the headshot. This image must contain one detectable face. This value is either\n- a direct URL to the video file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                ),
                        })
                        .strict()
                        .describe("Provide the assets for headshot photo"),
                })
                .strict(),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 50 },
        },
    },
});
