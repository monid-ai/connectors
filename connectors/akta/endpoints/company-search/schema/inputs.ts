import { z } from "zod";

/** Akta /v1/company/search query params (ported from v1). */
export const zCompanySearchQueryParams = z.object({
    query: z.string().min(1).describe(
        "A company name or website. The backend auto-detects the input " +
            "type. Examples: 'https://canva.com', 'canva'.",
    ),
}).strict();
