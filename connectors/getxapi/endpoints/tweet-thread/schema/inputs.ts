import { z } from "zod";
import { zNumericId } from "../../../schema/common.ts";

/** GET /tweet/thread query params (docs.getxapi.com/docs/tweets/tweet-thread,
 *  public OpenAPI 3.1, read 2026-09-23). */
export const zTweetThreadQueryParams = z.object({
    id: zNumericId.describe(
        "Numeric id of any tweet in the thread, the root or a later one.",
    ),
}).strict();
