import { z } from "zod";

/** Faithful mirror of the `/section/{act_id}/changes` query string. */
export const zSectionChangesQueryParams = z.object({
    limit: z.number().int().min(1).max(200).describe(
        "Max changes to return on this page.",
    ).optional(),
    sinceId: z.number().int().min(0).describe(
        "Return only changes with an `id` greater than this: the cursor " +
            "for polling forward into new changes.",
    ).optional(),
    beforeId: z.number().int().min(0).describe(
        "Return only changes with an `id` less than this: the cursor for " +
            "walking back through history.",
    ).optional(),
    changeKind: z.array(z.enum(["added", "amended", "removed"])).describe(
        "Filter to these kinds of change. Repeat the parameter to combine " +
            "them.",
    ).optional(),
    order: z.enum(["asc", "desc"]).describe(
        "`desc` is newest first, the natural reading order for a history. " +
            "Use `asc` to replay a section's life forward.",
    ).optional(),
});
