import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";

// Input schema: Magic Hour public OpenAPI, 2026-10-09; concrete settings pin pricing.
export default defineEndpoint({
    meta: {
        displayName: "Magic Hour AI Image Generator",
        summary: "AI Image Generator",
        description:
            "AI Image Generator. This Monid route pins model=z-image-turbo, resolution=1k so pre-run pricing is deterministic. Monid submits once, polls the corresponding project to completion and returns project metadata with expiring download URLs. Save outputs promptly. Upload local media through /v1/files/upload-urls and use its file_path; direct asset URLs are accepted where documented.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["image-generation"],
    },
    request: { method: "POST", path: "/v1/ai-image-generator" },
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
                    image_count: z
                        .number()
                        .int()
                        .min(1)
                        .max(16)
                        .describe(
                            "Number of images to generate. Maximum varies by model.",
                        ),
                    model: z.literal("z-image-turbo").default("z-image-turbo"),
                    aspect_ratio: z
                        .enum(["1:1", "16:9", "9:16"])
                        .describe(
                            "The aspect ratio of the output image(s). If not specified, defaults to `1:1` (square).",
                        )
                        .optional(),
                    resolution: z.literal("1k").default("1k"),
                    style: z
                        .object({
                            prompt: z
                                .string()
                                .min(1)
                                .describe("The prompt used for the image(s)."),
                            tool: z
                                .enum([
                                    "ai-anime-generator",
                                    "ai-art-generator",
                                    "ai-background-generator",
                                    "ai-character-generator",
                                    "ai-face-generator",
                                    "ai-fashion-generator",
                                    "ai-icon-generator",
                                    "ai-illustration-generator",
                                    "ai-interior-design-generator",
                                    "ai-landscape-generator",
                                    "ai-logo-generator",
                                    "ai-manga-generator",
                                    "ai-outfit-generator",
                                    "ai-pattern-generator",
                                    "ai-photo-generator",
                                    "ai-sketch-generator",
                                    "ai-tattoo-generator",
                                    "album-cover-generator",
                                    "animated-characters-generator",
                                    "architecture-generator",
                                    "book-cover-generator",
                                    "comic-book-generator",
                                    "dark-fantasy-ai",
                                    "disney-ai-generator",
                                    "dnd-ai-art-generator",
                                    "emoji-generator",
                                    "fantasy-map-generator",
                                    "graffiti-generator",
                                    "movie-poster-generator",
                                    "optical-illusion-generator",
                                    "pokemon-generator",
                                    "south-park-character-generator",
                                    "superhero-generator",
                                    "thumbnail-maker",
                                    "general",
                                ])
                                .describe(
                                    "The art style to use for image generation. Defaults to 'general' if not provided.",
                                )
                                .optional(),
                        })
                        .strict()
                        .describe("The art style to use for image generation."),
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
            counts: { CREDIT: data.input.body.image_count * 5 },
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
