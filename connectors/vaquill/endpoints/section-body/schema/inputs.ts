import { z } from "zod";

/** Faithful mirror of the `/section/{act_id}/body` query string. */
export const zSectionBodyQueryParams = z.object({
    format: z.enum(["both", "html", "plain", "content", "operative"]).describe(
        "Which representations to return. A long section otherwise carries " +
            "the same text twice, so name one: `plain` for text, `html` to " +
            "keep the publisher's markup, `content` for the section without " +
            "the surrounding notes, `operative` for the enacted text alone.",
    ).optional(),
    structured: z.boolean().describe(
        "Also return `markdown` and a `subsections` tree parsed from the " +
            "text, so a pincite like (b)(2) can be addressed directly. " +
            "Same price.",
    ).optional(),
    asOf: z.iso.date().describe(
        "Return the section's text as it stood on this date " +
            "(`YYYY-MM-DD`) instead of today. The response's `asOf` block " +
            "reports what was reconstructed, and its `isBounded` flag says " +
            "whether we observed a change affecting that date, which is " +
            "not the same as there having been none.",
    ).optional(),
});
