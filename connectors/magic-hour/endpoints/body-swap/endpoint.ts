// Input schema transcribed from Magic Hour public OpenAPI (2026-10-09).
import { defineEndpoint, UsageModelKind, Unit } from "@shared/core";
import { z } from "zod";

export default defineEndpoint({
    meta: {
        displayName: "Magic Hour Body Swap",
        summary: "Body Swap",
        description:
            "Swap a person into a scene image using Nano Banana 2 Lite (640px/1k) or Nano Banana 2 (2k/4k). Credits depend on `resolution` (from 50 credits at 640px upward). Monid waits for the project to finish. Download URLs expire; save the result promptly.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["image-generation"],
    },
    endpoint: "/v1/body-swap",
    request: { method: "POST", path: "/v1/body-swap" },
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
                    resolution: z
                        .enum(["640px", "1k", "2k", "4k"])
                        .describe(
                            "Output resolution. Determines credits charged for the run.",
                        ),
                    assets: z
                        .object({
                            person_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "Image of the person to place into the scene. This value is either\n- a direct URL to the video file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                ),
                            scene_file_path: z
                                .string()
                                .min(1)
                                .describe(
                                    "Original scene image (background). This value is either\n- a direct URL to the video file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                ),
                        })
                        .strict()
                        .describe("Person image and scene image for body swap"),
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
                CREDIT: { "640px": 50, "1k": 50, "2k": 150, "4k": 200 }[
                    data.input.body.resolution
                ],
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
