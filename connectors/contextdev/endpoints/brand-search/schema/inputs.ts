import { z } from "zod";

/** GET /brand/search query params — the vendor mirror
 *  (docs.context.dev/api-reference/brand-intelligence/search, 2026-09-17).
 *  `queryBy` is an array: the engine sends it as a repeated key, which the
 *  vendor documents as accepted alongside the comma form. */
export const zBrandSearchQueryParams = z.object({
    query: z.string().min(1).max(100).describe(
        "Search term, matched against the fields selected by queryBy — a " +
            "brand name, a domain, or a prefix of either (e.g. 'nike', " +
            "'nike.com', 'nik').",
    ),
    autocomplete: z.boolean().describe(
        "Match by prefix so partial words match as they are typed (default " +
            "true). Set false to match whole words only.",
    ).optional(),
    queryBy: z.array(z.enum(["name", "domain"])).min(1).describe(
        "Fields to match against: 'name', 'domain', or both. Defaults to " +
            "both. Name matches rank ahead of domain-only matches.",
    ).optional(),
    typoTolerance: z.number().int().min(0).max(2).describe(
        "Maximum typos tolerated when matching, 0-2. Default 0.",
    ).optional(),
}).strict();
