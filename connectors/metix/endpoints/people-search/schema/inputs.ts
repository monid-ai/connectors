import { z } from "zod";
import { zSize } from "../../../schema/common.ts";

/** POST /v1/people-search body. Strict, as the vendor declares it
 *  (`additionalProperties: false`). */
export const zMetixPeopleSearchBody = z.object({
    text: z.string().min(1).max(5000).describe(
        "Natural-language description of the people to find, e.g. " +
            "'Python backend engineer with 5 years experience in " +
            "Shanghai'. Use this only when the constraints cannot be " +
            "written as fields; a structured query over the same index " +
            "costs less and is reproducible.",
    ),
    size: zSize,
}).strict();
