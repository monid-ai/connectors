import { z } from "zod";
import { zUserName } from "../../../schema/common.ts";

/** GET /user/status query params (docs.getxapi.com/docs/users/user-status,
 *  public OpenAPI 3.1, read 2026-09-23). */
export const zUserStatusQueryParams = z.object({
    userName: zUserName,
}).strict();
