import { z } from "zod";
import { zCountry, zKeywords } from "../../../../schema/common.ts";

export const zOverviewQueryParams = z.object({
    country: zCountry,
    keywords: zKeywords,
}).strict();
