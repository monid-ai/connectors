import { z } from "zod";
import { webSearchOptionFields } from "../../../schema/search-options.ts";

/** Octen /search body — the search options FLATTEN into the body (v1). */
export const zOctenSearchBody = z.object({
    query: z.string().min(1).max(500).describe("The search query."),
    ...webSearchOptionFields,
}).strict();
