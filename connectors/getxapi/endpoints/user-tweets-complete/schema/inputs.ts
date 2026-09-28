import { z } from "zod";
import { zCursor, zUserName } from "../../../schema/common.ts";

/** GET /user/tweets/complete query params (docs.getxapi.com/docs/users/user-tweets-complete,
 *  public OpenAPI 3.1, read 2026-09-23). */
export const zUserTweetsCompleteQueryParams = z.object({
    userName: zUserName,
    cursor: zCursor.optional(),
}).strict();
