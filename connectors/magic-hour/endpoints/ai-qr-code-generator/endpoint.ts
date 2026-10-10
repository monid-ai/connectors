// Input schema transcribed from Magic Hour public OpenAPI (2026-10-09).
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";

export default defineEndpoint({
    meta: {
        displayName: "Magic Hour AI QR Code Generator",
        summary: "AI QR Code Generator",
        description:
            "Create an AI QR code. Each QR code costs 0 credits. Monid waits for the project to finish. Download URLs expire; save the result promptly.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["image-generation"],
    },
    endpoint: "/v1/ai-qr-code-generator",
    request: { method: "POST", path: "/v1/ai-qr-code-generator" },
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
                    content: z.string().describe("The content of the QR code."),
                    style: z
                        .object({
                            art_style: z
                                .string()
                                .describe(
                                    "To use our templates, pass in one of Watercolor, Cyberpunk City, Ink Landscape, Interior Painting, Japanese Street, Mech, Minecraft, Picasso Painting, Game Map, Spaceship, Chinese Painting, Winter Village, or pass any custom art style.",
                                ),
                        })
                        .strict(),
                })
                .strict(),
        },
    },
    usage: {
        model: { kind: UsageModelKind.FREE },
        consolidate: ({ data }) => ({ credits: {}, output: data.output }),
    },
});
