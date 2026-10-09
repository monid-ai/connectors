import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";

// Input schema: Magic Hour public OpenAPI, 2026-10-09; concrete settings pin pricing.
export default defineEndpoint({
    meta: {
        displayName: "Magic Hour AI Image Editor",
        summary: "AI Image Editor",
        description:
            "AI Image Editor. This Monid route pins model=qwen-edit, resolution=1k, image_count=1 so pre-run pricing is deterministic. Monid submits once, polls the corresponding project to completion and returns project metadata with expiring download URLs. Save outputs promptly. Upload local media through /v1/files/upload-urls and use its file_path; direct asset URLs are accepted where documented.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["image-generation"],
    },
    request: { method: "POST", path: "/v1/ai-image-editor" },
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
                    image_count: z.literal(1).default(1),
                    model: z.literal("qwen-edit").default("qwen-edit"),
                    aspect_ratio: z
                        .enum([
                            "auto",
                            "16:9",
                            "9:16",
                            "4:3",
                            "3:2",
                            "1:1",
                            "4:5",
                            "2:3",
                        ])
                        .describe(
                            "The aspect ratio of the output image(s). If not specified, defaults to `auto`.",
                        )
                        .optional(),
                    resolution: z.literal("1k").default("1k"),
                    style: z
                        .object({
                            prompt: z
                                .string()
                                .min(1)
                                .max(15000)
                                .describe("The prompt used to edit the image."),
                        })
                        .strict(),
                    assets: z
                        .object({
                            image_file_paths: z
                                .array(z.string().min(1))
                                .max(3)
                                .describe(
                                    "The image(s) used in the edit, maximum of 3 images for the pinned Qwen Edit model. This value is either\n- a direct URL to the image file\n- `file_path` field from the response of the [upload urls API](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls).\n\nSee the [file upload guide](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls#input-file) for details.\n",
                                )
                                .optional(),
                        })
                        .strict()
                        .describe("Provide the assets for image edit"),
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
        estimate: ({ data }) => ({ counts: { CREDIT: 10 } }),
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
