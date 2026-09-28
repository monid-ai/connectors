import { z } from "zod";
import { zCursor, zNumericId, zUserName } from "../../../schema/common.ts";

/** GET /user/tweets query params (docs.getxapi.com/docs/users/user-tweets,
 *  public OpenAPI 3.1, read 2026-09-23). The vendor takes `userName` OR
 *  `userId`, so the mirror is two strict arms: each arm omits the other key,
 *  which also refuses a request carrying both. */
export const zUserTweetsQueryParams = z.union([
    z.object({
        userName: zUserName,
        cursor: zCursor.optional(),
    }).strict(),
    z.object({
        userId: zNumericId.describe(
            "Numeric X user id. Faster than userName and survives a rename.",
        ),
        cursor: zCursor.optional(),
    }).strict(),
]);
