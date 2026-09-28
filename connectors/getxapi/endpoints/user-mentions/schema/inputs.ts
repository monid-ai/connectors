import { z } from "zod";
import { zCursor, zUserName } from "../../../schema/common.ts";

/** GET /user/mentions query params (docs.getxapi.com/docs/users/user-mentions,
 *  public OpenAPI 3.1, read 2026-09-23). */
export const zUserMentionsQueryParams = z.object({
    userName: zUserName.describe(
        "Username whose mentions to fetch, without the leading @.",
    ),
    cursor: zCursor.optional(),
}).strict();
