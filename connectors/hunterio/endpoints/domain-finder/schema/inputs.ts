import { z } from "zod";
import { zCompanyName } from "../../../schema/common.ts";

/** GET /domain-finder query — the vendor mirror (hunter.io
 *  api-documentation/v2#domain-finder, 2026-09-17; upstream Beta). */
export const zDomainFinderQueryParams = z.object({
    company: zCompanyName.describe(
        "The company name to resolve into a domain, e.g. 'Stripe' or " +
            "'Y Combinator'. Min 3 characters.",
    ),
    limit: z.number().int().min(1).max(10).describe(
        "Max suggestions to return (1-10). Default 5.",
    ).optional(),
    perfect_match: z.boolean().describe(
        "true → only suggestions with very high similarity to the given " +
            "name (one confident answer instead of candidates). Default " +
            "false.",
    ).optional(),
}).strict();
