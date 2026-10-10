import { z } from "zod";
import { zSourceSelection } from "../../../schema/common.ts";

/** POST /entity/v1/profiles/detail-by-id body. NOT strict: unlike the
 *  search routes, the vendor does not declare `additionalProperties:
 *  false` here, and the mirror stays faithful (design D25). The vendor
 *  also accepts `source` as an alias for `_source`. */
export const zMetixProfilesDetailBody = z.object({
    profile_ids: z.array(z.string()).min(1).max(100).describe(
        "Encrypted string profile IDs returned by a Metix search. " +
            "Maximum 100 per request.",
    ),
    _source: zSourceSelection,
});
