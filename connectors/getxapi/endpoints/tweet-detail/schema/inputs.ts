import { z } from "zod";
import { zNumericId } from "../../../schema/common.ts";

/** GET /tweet/detail query params (docs.getxapi.com/docs/tweets/tweet-detail,
 *  public OpenAPI 3.1, read 2026-09-23). */
export const zTweetDetailQueryParams = z.object({
    id: zNumericId.describe(
        "Numeric tweet id, the number after /status/ in a tweet URL.",
    ),
}).strict();
