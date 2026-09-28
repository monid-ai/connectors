import { z } from "zod";
import { zLookbackDays } from "../../../schema/common.ts";

/** `GET /v1/insider/trades/{ticker}` query parameters. */
export const zInsiderTradesQueryParams = z.strictObject({
    lookbackDays: zLookbackDays.optional(),
});
