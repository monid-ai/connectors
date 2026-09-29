import { z } from "zod";
import { zCountryLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/keywords_data/bing/audience_estimation/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zKeywordsBingAudienceEstimationBody = z.object({
    ...zCountryLocaleFields,
    age: z.array(z.string().min(1)).describe(
        "Selection of age ranges for targeting (values: zero_to_twelve, thirteen_to_seventeen, eighteen_to_twenty_four, twenty_five_to_thirty_four, thirty_five_to_forty_nine, fifty_to_sixty_four, sixty_five_and_above, unknown)",
    ).optional(),
    bid: z.number().describe(
        "Desired bid setting value in USD (max 1000)",
    ).optional(),
    daily_budget: z.number().describe(
        "Daily campaign budget value in USD (max 10000)",
    ).optional(),
    gender: z.array(z.string().min(1)).describe(
        "Gender to target (values: male, female, unknown)",
    ).optional(),
    industry: z.array(z.string().min(1)).describe(
        "Industry of LinkedIn profile targeting (e.g. 806301758)",
    ).optional(),
    job_function: z.array(z.string().min(1)).describe(
        "Job function of LinkedIn profile targeting (e.g. 806300451)",
    ).optional(),
}).strict();
