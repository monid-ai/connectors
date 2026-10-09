import { z } from "zod";

/** POST /api/tiktok/search body — the vendor mirror (the marketplace card via v1, 2026-09-17). */
export const zTiktokSearchBody = z.object({
    query: z.string().min(1).describe(
        "Product search keywords, e.g. 'wireless earbuds'.",
    ),
    count: z.number().int().min(1).describe(
        "Number of products to return.",
    ).optional(),
}).strict();
