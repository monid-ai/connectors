import { z } from "zod";
import { zCompanyName, zDomain } from "../../../schema/common.ts";

/** GET /email-finder query — the vendor mirror (hunter.io
 *  api-documentation/v2#email-finder, 2026-09-17). Identify the company
 *  (domain, company, or linkedin_handle) and the person (first_name +
 *  last_name, or full_name — optional with linkedin_handle); bound as a
 *  union in endpoint.ts. */
export const zEmailFinderQueryParams = z.object({
    domain: zDomain.optional(),
    company: zCompanyName.optional(),
    linkedin_handle: z.string().min(1).describe(
        "LinkedIn profile handle of the person. When given, the name " +
            "fields are optional.",
    ).optional(),
    first_name: z.string().min(1).describe("The person's first name.")
        .optional(),
    last_name: z.string().min(1).describe("The person's last name.")
        .optional(),
    full_name: z.string().min(1).describe(
        "The person's full name. first_name + last_name gives better " +
            "results when available.",
    ).optional(),
    max_duration: z.number().int().min(3).max(20).describe(
        "Max seconds upstream may spend refining the result (3-20, " +
            "default 10). Longer is more accurate.",
    ).optional(),
}).strict();
