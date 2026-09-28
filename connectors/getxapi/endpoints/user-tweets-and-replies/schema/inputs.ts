import { z } from "zod";
import { zCursor, zUserName } from "../../../schema/common.ts";

/** GET /user/tweets_and_replies query params (docs.getxapi.com/docs/users/user-tweets-and-replies,
 *  public OpenAPI 3.1, read 2026-09-23). */
export const zUserTweetsAndRepliesQueryParams = z.object({
    userName: zUserName,
    cursor: zCursor.optional(),
}).strict();
