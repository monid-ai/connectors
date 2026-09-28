import { z } from "zod";
import { zNumericId } from "../../../schema/common.ts";

/** GET /community/info query params (docs.getxapi.com/docs/community/community-info,
 *  public OpenAPI 3.1, read 2026-09-23). */
export const zCommunityInfoQueryParams = z.object({
    communityId: zNumericId.describe(
        "Numeric community id, from x.com/i/communities/<id>.",
    ),
}).strict();
