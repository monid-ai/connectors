import { z } from "zod";
import { zCursor, zUserName } from "../../../schema/common.ts";

/** GET /user/followers query params (docs.getxapi.com/docs/users/followers,
 *  public OpenAPI 3.1, read 2026-09-23). */
export const zUserFollowersQueryParams = z.object({
    userName: zUserName,
    cursor: zCursor.optional(),
}).strict();
