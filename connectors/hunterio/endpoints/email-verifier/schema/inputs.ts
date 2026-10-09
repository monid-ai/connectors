import { z } from "zod";

/** GET /email-verifier query — the vendor mirror (hunter.io
 *  api-documentation/v2#email-verifier, 2026-09-17). */
export const zEmailVerifierQueryParams = z.object({
    email: z.string().email().describe("The email address to verify."),
}).strict();
