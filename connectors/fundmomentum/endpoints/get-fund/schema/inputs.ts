import { z } from "zod";

/**
 * `get_fund` tool arguments (fundmomentum.vc, README "Tool reference",
 * 2026-10). `slug` is the only argument; the vendor resolves a near-miss
 * name (case/spacing difference, or an unambiguous hyphen-boundary
 * prefix) to the real slug itself and reports `resolved_from` on the
 * output, so this mirror does not attempt that resolution.
 */
export const zFundmomentumGetFundArgs = z.looseObject({
    slug: z.string().min(1).describe(
        "The fund's slug, from a prior 'search_funds' or 'match_startup' " +
            "call. Not derivable from the fund's display name. A near-" +
            "miss (case/spacing, or an unambiguous prefix) still " +
            "resolves; the response then carries 'resolved_from'.",
    ),
});
