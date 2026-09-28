import { z } from "zod";
import { zUserName } from "../../../schema/common.ts";

/** GET /user/user_about query params (docs.getxapi.com/docs/users/user-about,
 *  public OpenAPI 3.1, read 2026-09-23). */
export const zUserAboutQueryParams = z.object({
    userName: zUserName,
}).strict();
