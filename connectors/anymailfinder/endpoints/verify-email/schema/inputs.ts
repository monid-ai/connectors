import { z } from "zod";

/** POST /verify-email body - the vendor mirror
 *  (anymailfinder.com/email-finder-api/docs/verify-email, 2026-10-02). */
export const zVerifyEmailBody = z.object({
    email: z.string().min(3).describe(
        "The email address to verify, e.g. 'john.doe@microsoft.com'.",
    ),
}).strict();
