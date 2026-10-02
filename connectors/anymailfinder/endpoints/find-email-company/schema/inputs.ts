import { z } from "zod";
import { zCompanyName, zDomain } from "../../../schema/common.ts";

/** POST /find-email/company body - the vendor mirror
 *  (anymailfinder.com/email-finder-api/docs/find-company-email,
 *  2026-10-02). A company (domain or company_name); bound as a union in
 *  endpoint.ts. */
export const zFindCompanyEmailsBody = z.object({
    domain: zDomain.optional(),
    company_name: zCompanyName.optional(),
    email_type: z.enum(["any", "generic", "personal"]).describe(
        "'any' (default) returns both kinds; 'generic' only role " +
            "addresses like info@ or sales@; 'personal' only individual " +
            "employees' work addresses.",
    ).optional(),
}).strict();
