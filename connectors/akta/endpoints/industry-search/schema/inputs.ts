import { z } from "zod";

/** Akta /v1/industry/search query params (ported from v1). */
export const zIndustrySearchQueryParams = z.object({
    query: z.string().min(1).describe(
        "Free-text industry name or topic to resolve into codes. " +
            "Example: 'warehouse automation'.",
    ),
}).strict();
