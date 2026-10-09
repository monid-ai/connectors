import { z } from "zod";

/** GET /people/find query — the vendor mirror (hunter.io
 *  api-documentation/v2#email-enrichment, 2026-09-17). Provide at least
 *  one of email or linkedin_handle — bound as a union in endpoint.ts.
 *  `clearbit_format` is not carried (undocumented semantics, v1 posture). */
export const zPeopleFindQueryParams = z.object({
    email: z.string().email().describe("The email address to look up.")
        .optional(),
    linkedin_handle: z.string().min(1).describe(
        "LinkedIn profile handle. Takes precedence when email is also given.",
    ).optional(),
}).strict();
