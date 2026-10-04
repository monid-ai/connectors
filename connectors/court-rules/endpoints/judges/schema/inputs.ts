import { z } from "zod";

/**
 * `GET /api/v1/judges` query params, mirrored from the published docs
 * (https://docs.courtrules.app/api-reference/judges/list-judges).
 *
 * Optionality only, and no defaults are invented here (design D25): the
 * docs show `district_id` alone and `limit` on their own examples.
 */
export const zCourtRulesJudgesQuery = z.object({
    district_id: z.string().min(1).optional().describe(
        "CourtRules district id, for example edny or " +
            "ca-los-angeles-superior. Omit to list every covered court.",
    ),
    limit: z.number().int().min(1).max(100).optional().describe(
        "Maximum number of judges to return.",
    ),
}).strict();
