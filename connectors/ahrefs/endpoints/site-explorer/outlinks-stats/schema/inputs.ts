import { z } from "zod";
import { zMode, zProtocol, zTarget } from "../../../../schema/common.ts";

export const zOutlinksStatsQueryParams = z.object({
    target: zTarget,
    mode: zMode.optional(),
    protocol: zProtocol.optional(),
}).strict();
