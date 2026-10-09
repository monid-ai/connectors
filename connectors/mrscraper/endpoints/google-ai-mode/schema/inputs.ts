import { z } from "zod";
import { zSearchCountry } from "../../../schema/common.ts";

/** POST /api/google/ai-mode/sync body — the vendor mirror (the
 *  marketplace card via v1, 2026-09-17). */
export const zGoogleAiModeBody = z.object({
    keyword: z.string().min(1).describe("Keyword or question to search."),
    url: z.string().regex(/^https?:\/\/\S+$/).describe(
        "Optional image URL to include with the query (multimodal search).",
    ).optional(),
    country: zSearchCountry.optional(),
    location: z.string().min(1).describe(
        "Free-text location for the search, e.g. 'Austin, Texas'.",
    ).optional(),
}).strict();
