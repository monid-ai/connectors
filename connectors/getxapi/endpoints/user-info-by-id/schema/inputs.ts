import { z } from "zod";
import { zNumericId } from "../../../schema/common.ts";

/** GET /user/info_by_id query params (docs.getxapi.com/docs/users/user-info-by-id,
 *  public OpenAPI 3.1, read 2026-09-23). */
export const zUserInfoByIdQueryParams = z.object({
    userId: zNumericId.describe("Numeric X user id, for example '11348282'."),
}).strict();
