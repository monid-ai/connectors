import { z } from "zod";
import { zCursor, zNumericId } from "../../../schema/common.ts";

/** GET /tweet/retweeters query params (docs.getxapi.com/docs/tweets/retweeters,
 *  public OpenAPI 3.1, read 2026-09-23). */
export const zTweetRetweetersQueryParams = z.object({
    id: zNumericId.describe(
        "Numeric id of the tweet whose reposters to fetch.",
    ),
    cursor: zCursor.optional(),
}).strict();
