import { z } from "zod";
import {
    zCountry,
    zDate,
    zMode,
    zProtocol,
    zTarget,
} from "../../../../schema/common.ts";

export const zMetricsQueryParams = z.object({
    target: zTarget,
    date: zDate,
    country: zCountry.optional(),
    mode: zMode.optional(),
    protocol: zProtocol.optional(),
}).strict();
