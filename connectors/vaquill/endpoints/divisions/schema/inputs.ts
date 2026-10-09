import { z } from "zod";
import { zActStatus, zJurisdictionState } from "../../../schema/common.ts";

/**
 * Faithful mirror of the `/us/statutes/divisions` query string.
 *
 * `corpusType` here is the browsable subset, not the full 21-value search
 * vocabulary: only these four have a hierarchy to walk.
 */
export const zDivisionsQueryParams = z.object({
    corpusType: z.enum(["USC", "CFR", "STATE", "REGULATION"]).describe(
        "Corpus to browse. `USC` and `CFR` are the federal code and " +
            "regulations, `STATE` a state statutory code, `REGULATION` a " +
            "state administrative code.",
    ),
    state: zJurisdictionState.describe(
        "Two-letter jurisdiction, required for `STATE` and `REGULATION`.",
    ).optional(),
    titleNumber: z.number().int().min(1).describe(
        "USC or CFR title number to drill into.",
    ).optional(),
    code: z.string().describe(
        "State code identifier, e.g. `tx_pe`. Browse with `corpusType` " +
            "`STATE` and a `state` to list the codes available.",
    ).optional(),
    chapter: z.string().describe(
        "Chapter identifier to drill into (USC and state codes).",
    ).optional(),
    part: z.string().describe(
        "Part identifier to drill into (CFR).",
    ).optional(),
    excludeRepealed: z.boolean().describe(
        "Leave out sections whose status is affirmatively dead. A section " +
            "carrying no recorded status is kept.",
    ).optional(),
    actStatus: zActStatus.describe(
        "List only sections carrying this status. The inverse of " +
            "`excludeRepealed`, and how you audit dead law on purpose.",
    ).optional(),
    cursor: z.string().describe(
        "Resume token from a previous response's `nextCursor`. Only " +
            "meaningful at the level that lists sections.",
    ).optional(),
});
