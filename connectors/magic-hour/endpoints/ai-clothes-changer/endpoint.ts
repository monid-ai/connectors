// Input schema transcribed from Magic Hour public OpenAPI (2026-10-09).
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";

export default defineEndpoint({
    meta: {
        displayName: "Magic Hour AI Clothes Changer",
        summary: "AI Clothes Changer",
        description:
            "Change outfits in photos in seconds with just a photo reference. Each photo costs 25 credits. Monid waits for the project to finish. Download URLs expire; save the result promptly.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["image-generation"],
    },
    endpoint: "/v1/ai-clothes-changer",
    request: { method: "POST", path: "/v1/ai-clothes-changer" },
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
                    assets: z
                        .object({
                            person_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "The image with the person. This value is either\n- a direct URL to the media file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                ),
                            garment_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "The image of the outfit. This value is either\n- a direct URL to the media file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                ),
                            garment_type: z
                                .enum([
                                    "entire_outfit",
                                    "upper_body",
                                    "lower_body",
                                    "dresses",
                                ])
                                .describe(
                                    "Type of clothing item to swap. If not provided, swaps the entire outfit. \n* `upper_body` - for shirts/jackets \n* `lower_body` - for pants/skirts \n* `dresses` - for entire outfit (deprecated, use `entire_outfit` instead) \n* `entire_outfit` - for entire outfit",
                                )
                                .optional(),
                        })
                        .strict()
                        .describe("Provide the assets for clothes changer"),
                })
                .strict(),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 25 },
        },
    },
});
