import { z } from "zod";
import { zCountry, zDate, zKeyword } from "../../../../schema/common.ts";

export const zSerpOverviewQueryParams = z.object({
    keyword: zKeyword,
    country: zCountry,
    date: zDate.optional(),
    top_positions: z.number().int().describe(
        "How many top positions to return (one billed row per position).",
    ).optional(),
}).strict();
