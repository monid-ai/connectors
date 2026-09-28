import { z } from "zod";
import { zCursor } from "../../../schema/common.ts";

/** GET /user/search query params (docs.getxapi.com/docs/users/user-search,
 *  public OpenAPI 3.1, read 2026-09-23). */
export const zUserSearchQueryParams = z.object({
    q: z.string().min(1).describe(
        "Search terms: a name, username, or topic, for example 'space agency'.",
    ),
    cursor: zCursor.optional(),
}).strict();
