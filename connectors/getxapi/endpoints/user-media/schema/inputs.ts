import { z } from "zod";
import { zCursor, zUserName } from "../../../schema/common.ts";

/** GET /user/media query params (docs.getxapi.com/docs/users/user-media,
 *  public OpenAPI 3.1, read 2026-09-23). */
export const zUserMediaQueryParams = z.object({
    userName: zUserName,
    cursor: zCursor.optional(),
}).strict();
