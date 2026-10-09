import { z } from "zod";
import { zDate, zMode, zProtocol, zTarget } from "../../../../schema/common.ts";

export const zMetricsByCountryQueryParams = z.object({
    target: zTarget,
    date: zDate,
    mode: zMode.optional(),
    protocol: zProtocol.optional(),
}).strict();
