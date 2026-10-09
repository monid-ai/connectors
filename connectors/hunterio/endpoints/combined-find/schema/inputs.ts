import { z } from "zod";

/** GET /combined/find query — the vendor mirror (hunter.io
 *  api-documentation/v2#combined-enrichment, 2026-09-17). */
export const zCombinedFindQueryParams = z.object({
    email: z.string().email().describe("The email address to look up."),
}).strict();
