import { z } from "zod";
import { zKeyword } from "../../../../schema/common.ts";

export const zVolumeByCountryQueryParams = z.object({
    keyword: zKeyword,
    limit: z.number().int().describe(
        "Maximum number of countries to return (one billed row per country).",
    ).optional(),
}).strict();
