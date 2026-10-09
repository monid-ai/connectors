import { z } from "zod";

/** POST /api/tiktok/tags/sync body — the vendor mirror (the marketplace
 *  card via v1, 2026-09-17). */
export const zTiktokHashtagBody = z.object({
    tag: z.string().min(1).regex(/^[^#\s]+$/).describe(
        "Hashtag name without the # sign, e.g. 'lego'.",
    ),
}).strict();
