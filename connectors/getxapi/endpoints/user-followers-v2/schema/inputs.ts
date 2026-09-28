import { z } from "zod";
import { zCursor, zUserName } from "../../../schema/common.ts";

/** GET /user/followers_v2 query params (docs.getxapi.com/docs/users/followers-v2,
 *  public OpenAPI 3.1, read 2026-09-23). */
export const zUserFollowersV2QueryParams = z.object({
    userName: zUserName,
    cursor: zCursor.optional(),
}).strict();
