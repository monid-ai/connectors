import { z } from "zod";
import { zCursor, zNumericId } from "../../../schema/common.ts";

/** GET /list/members query params (docs.getxapi.com/docs/lists/list-members,
 *  public OpenAPI 3.1, read 2026-09-23). */
export const zListMembersQueryParams = z.object({
    listId: zNumericId.describe("Numeric list id, from x.com/i/lists/<id>."),
    cursor: zCursor.optional(),
}).strict();
