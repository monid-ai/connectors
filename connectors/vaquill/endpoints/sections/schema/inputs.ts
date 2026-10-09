import { z } from "zod";

/** Faithful mirror of `StatuteSectionsRequest`. */
export const zStatuteSectionsBody = z.object({
    actIds: z.array(z.string()).min(1).max(50).describe(
        "Section identifiers, up to 50 per call. Duplicates are collapsed " +
            "and order is preserved, so the response lines up with the " +
            "de-duplicated input.",
    ),
    includeBody: z.boolean().describe(
        "Return each section's full text inline on `body` instead of " +
            "metadata only. Adds the ordinary body price per row that " +
            "returns text. Rows whose text cannot be resolved come back " +
            "`body: null` and are not charged for it.",
    ).optional(),
});
