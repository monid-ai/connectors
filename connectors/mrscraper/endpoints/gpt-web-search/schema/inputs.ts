import { z } from "zod";
import { zQuestion, zSearchCountry } from "../../../schema/common.ts";

/** POST /api/gpt/websearch/sync body — the vendor mirror (the marketplace card via v1,
 *  2026-09-17). */
export const zGptWebSearchBody = z.object({
    query: zQuestion,
    country: zSearchCountry.optional(),
}).strict();
