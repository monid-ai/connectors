import { z } from "zod";
import {
    zCountry,
    zMode,
    zProtocol,
    zTarget,
} from "../../../../schema/common.ts";

export const zPagesByTrafficQueryParams = z.object({
    target: zTarget,
    mode: zMode.optional(),
    protocol: zProtocol.optional(),
    country: zCountry.optional(),
}).strict();
