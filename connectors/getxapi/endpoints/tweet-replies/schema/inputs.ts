import { z } from "zod";
import { zCursor, zNumericId } from "../../../schema/common.ts";

/** GET /tweet/replies query params (docs.getxapi.com/docs/tweets/tweet-replies,
 *  public OpenAPI 3.1, read 2026-09-23). */
export const zTweetRepliesQueryParams = z.object({
    id: zNumericId.describe("Numeric id of the tweet whose replies to fetch."),
    cursor: zCursor.optional(),
}).strict();
