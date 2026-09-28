import { z } from "zod";
import { zLookbackDays } from "../../../schema/common.ts";

/** `GET /v1/insider/cluster-buys` query parameters. */
export const zClusterBuysQueryParams = z.strictObject({
    lookbackDays: zLookbackDays.optional(),
});
