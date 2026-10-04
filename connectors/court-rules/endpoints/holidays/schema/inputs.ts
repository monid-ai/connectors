import { z } from "zod";

/**
 * `GET /api/v1/holidays` query params, mirrored from the published docs
 * (https://docs.courtrules.app/api-reference/holidays).
 *
 * Optionality only, and no defaults are invented here (design D25).
 */
export const zCourtRulesHolidaysQuery = z.object({
    district_id: z.string().min(1).optional().describe(
        "CourtRules district id, for example edny. Omit for federal-wide closures.",
    ),
    year: z.number().int().min(2000).max(2100).optional().describe(
        "Calendar year to return closures for.",
    ),
    limit: z.number().int().min(1).max(100).optional().describe(
        "Maximum number of closure dates to return.",
    ),
}).strict();
