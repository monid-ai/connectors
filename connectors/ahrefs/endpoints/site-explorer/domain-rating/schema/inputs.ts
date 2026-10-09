import { z } from "zod";
import { zDate, zTarget } from "../../../../schema/common.ts";

export const zDomainRatingQueryParams = z.object({
    target: zTarget,
    date: zDate,
}).strict();
