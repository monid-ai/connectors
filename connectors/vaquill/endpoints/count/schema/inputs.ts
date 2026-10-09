import { z } from "zod";
import {
    zActStatus,
    zCorpusType,
    zScopeState,
} from "../../../schema/common.ts";

/** Faithful mirror of `StatuteCountRequest`. Every field is optional: an
 *  empty body counts the whole corpus. */
export const zStatuteCountBody = z.object({
    corpusType: z.union([zCorpusType, z.array(zCorpusType)]).describe(
        "Restrict the count to one body of law, or a list of them.",
    ).optional(),
    state: z.union([zScopeState, z.array(zScopeState)]).describe(
        "Restrict to one jurisdiction, or a list. `federal` means the " +
            "federal corpora rather than a state.",
    ).optional(),
    code: z.union([z.string(), z.array(z.string())]).describe(
        "State code identifier, e.g. `tx_pe`. Pair it with `state`.",
    ).optional(),
    titleNumber: z.number().int().describe(
        "USC or CFR title number.",
    ).optional(),
    chapter: z.union([z.string(), z.array(z.string())]).describe(
        "Chapter identifier. Pair it with `titleNumber` or `code`.",
    ).optional(),
    part: z.union([z.string(), z.array(z.string())]).describe(
        "CFR part identifier. Pair it with `titleNumber`.",
    ).optional(),
    actStatus: z.union([zActStatus, z.array(zActStatus)]).describe(
        "Count only sections carrying this status.",
    ).optional(),
    excludeRepealed: z.boolean().describe(
        "Exclude sections whose status is affirmatively dead. A section " +
            "with no recorded status is kept, because a missing status is " +
            "not evidence of repeal.",
    ).optional(),
});
