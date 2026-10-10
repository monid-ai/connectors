import { z } from "zod";

/** Shared fragments for the Anymail Finder endpoint schemas - the vendor
 *  mirror (api.anymailfinder.com/openapi.json, v5.1, 2026-10-02). Only
 *  what two or more endpoints use lives here. */

/** Company domain (preferred over a company name upstream). */
export const zDomain = z.string().min(1).describe(
    "Company website domain, e.g. 'microsoft.com'. Preferred over " +
        "company_name - it gives more accurate results.",
);

/** Company name, used upstream only when no domain is given. */
export const zCompanyName = z.string().min(1).describe(
    "Company name, e.g. 'Microsoft'. Used only when domain is not given; " +
        "upstream resolves it to a domain.",
);
