import { z } from "zod";
import { zAfter, zSize, zWhere } from "../../../schema/common.ts";

/** POST /v1/people/query body. Strict, as the vendor declares it
 *  (`additionalProperties: false`), so a misspelled key fails validation
 *  here rather than running with the vendor defaults and being billed. */
export const zMetixPeopleQueryBody = z.object({
    where: zWhere,
    size: zSize,
    after: zAfter,
}).strict();
