import { z } from "zod";
import { zUserName } from "../../../schema/common.ts";

/** GET /user/info query params (docs.getxapi.com/docs/users/user-info,
 *  public OpenAPI 3.1, read 2026-09-23). */
export const zUserInfoQueryParams = z.object({
    userName: zUserName,
}).strict();
