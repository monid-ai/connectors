import { z } from "zod";

/** Vendor input mirror: https://docs.companyenrich.com/reference/post_people-lookup
 * OpenAPI checked 2026-10-07; no connector defaults in this mirror. */

export const zPersonLookupRequest = z.object({
    email: z.string().describe("The email address of the person to look up"),
});

export const zLookupPersonQuery = z.object({
    expand: z.array(z.enum(["education"])).describe(
        "Expandable response fields. Repeat the parameter to request multiple expansions.\n\nSupported values:\n- `education`: costs 1 credit per person and adds the `education` field to `PersonInfo`.",
    ).optional(),
});
