// Input schema transcribed from Magic Hour public OpenAPI (2026-10-09).
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";

export default defineEndpoint({
    meta: {
        displayName: "Magic Hour Face Detection",
        summary: "Face Detection",
        description:
            "Detect faces in an image or video. \n      \nUse this API to get the list of faces detected in the image or video to use in the [face swap photo](https://docs.magichour.ai/api-reference/image-projects/face-swap-photo) or [face swap video](https://docs.magichour.ai/api-reference/video-projects/face-swap-video) API calls for multi-face swaps.\n\nNote: Face detection is free to use for the near future. Pricing may change in the future.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["image-generation"],
    },
    endpoint: "/v1/face-detection",
    request: { method: "POST", path: "/v1/face-detection" },
    input: {
        schema: {
            body: z
                .object({
                    confidence_score: z
                        .number()
                        .min(0)
                        .max(1)
                        .multipleOf(0.05)
                        .describe(
                            "Confidence threshold for filtering detected faces. \n* Higher values (e.g., 0.9) include only faces detected with high certainty, reducing false positives. \n* Lower values (e.g., 0.3) include more faces, but may increase the chance of incorrect detections.",
                        )
                        .optional(),
                    assets: z
                        .object({
                            target_file_path: z
                                .string()
                                .describe(
                                    "This is the image or video where the face will be detected. This value is either\n- a direct URL to the media file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                ),
                        })
                        .strict()
                        .describe("Provide the assets for face detection"),
                })
                .strict(),
        },
    },
    usage: {
        model: { kind: UsageModelKind.FREE },
        consolidate: ({ data }) => ({ credits: {}, output: data.output }),
    },
});
