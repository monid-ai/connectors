import { z } from "zod";
import { zJurisdictionState } from "../../../schema/common.ts";

/** Faithful mirror of `StatuteResolveBatchRequest`. */
export const zStatuteResolveBody = z.object({
    citations: z.array(z.string()).min(1).max(500).describe(
        "Bluebook citation strings to resolve, e.g. " +
            "`42 U.S.C. 1983` or `Tex. Penal Code 22.01`. Duplicates are " +
            "collapsed FIRST and order is preserved, so `results` lines up " +
            "with the de-duplicated input. The cap is 50 UNIQUE citations, " +
            "applied after that collapse, so a brief quoting one section " +
            "sixty times is one citation and is accepted. 500 is the raw " +
            "list ceiling.",
    ),
    state: zJurisdictionState.describe(
        "Resolve every citation WITHIN this jurisdiction. Some state " +
            "citation forms are ambiguous across states, and this settles " +
            "them.",
    ).optional(),
    corpusType: z.enum([
        "CONSTITUTION",
        "REGULATION",
        "STATE",
        "STATE_CONSTITUTION",
        "STATE_RULES",
    ]).describe(
        "Resolve every citation WITHIN this corpus: `STATE` for statutory " +
            "text, `REGULATION` for administrative codes, `STATE_RULES` for " +
            "court rules, `CONSTITUTION` for constitutional text.",
    ).optional(),
});
