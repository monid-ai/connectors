import { z } from "zod";
import { zCompanyName, zDomain } from "../../../schema/common.ts";

/** POST /find-email/person body - the vendor mirror
 *  (anymailfinder.com/email-finder-api/docs/find-person-email,
 *  2026-10-02). Identify the company (domain or company_name) and the
 *  person (full_name, or first_name + last_name), or send linkedin_url on
 *  its own; bound as a union in endpoint.ts. */
export const zFindPersonEmailBody = z.object({
    domain: zDomain.optional(),
    company_name: zCompanyName.optional(),
    full_name: z.string().min(1).describe(
        "The person's full name (first and last), e.g. 'Satya Nadella'.",
    ).optional(),
    first_name: z.string().min(1).describe(
        "The person's first name, with last_name.",
    ).optional(),
    last_name: z.string().min(1).describe(
        "The person's last name, with first_name.",
    ).optional(),
    linkedin_url: z.string().min(1).describe(
        "The person's LinkedIn profile URL. Sent on its own, the name and " +
            "company are read from the profile; with a name, it refines " +
            "the match.",
    ).optional(),
}).strict();
