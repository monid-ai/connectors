// Input schema transcribed from Magic Hour public OpenAPI (2026-10-09).
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";

export default defineEndpoint({
    meta: {
        displayName: "Magic Hour List saved items",
        summary: "List saved items",
        description:
            "Returns active saved items owned by the authenticated account, newest first. Each item includes every saved asset with a durable file_path for reuse in compatible generation APIs and a temporary signed URL for previewing or downloading. Filter by type to find characters, references, voices, moodboards, or brand kits. To fetch the next page, pass the response's next_cursor as cursor.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["image-generation"],
    },
    endpoint: "/v1/saved-items",
    request: { method: "GET", path: "/v1/saved-items" },
    input: {
        schema: {
            queryParams: z
                .object({
                    type: z
                        .enum([
                            "character",
                            "reference",
                            "voice",
                            "moodboard",
                            "brand_kit",
                        ])
                        .optional(),
                    limit: z.number().int().min(1).max(100).optional(),
                    cursor: z.string().min(1).optional(),
                })
                .strict(),
        },
    },
    usage: {
        model: { kind: UsageModelKind.FREE },
        consolidate: ({ data }) => ({ credits: {}, output: data.output }),
    },
});
