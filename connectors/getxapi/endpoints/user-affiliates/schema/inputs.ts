import { z } from "zod";
import { zCursor, zUserName } from "../../../schema/common.ts";

/** GET /user/affiliates query params (docs.getxapi.com/docs/users/user-affiliates,
 *  public OpenAPI 3.1, read 2026-09-23). */
export const zUserAffiliatesQueryParams = z.object({
    userName: zUserName.describe(
        "Username of the verified organization, without the leading @.",
    ),
    cursor: zCursor.optional(),
}).strict();
