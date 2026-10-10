import { z } from "zod";

/**
 * `check_lp_coverage` tool arguments (fundmomentum.vc, README "LP Radar
 * over MCP" / "Tool reference", 2026-10). `country` accepts a full name
 * OR a two-letter ISO code here (unlike `search_funds`'s `country`,
 * which the vendor's docs say is full-name only). `lp_type` is one of a
 * published list ('Pension fund', 'Family office / Holding', 'Fund-of-
 * Funds', …) that common spellings are normalized against; not
 * reproduced as a closed enum here since the full list is not published
 * in the README (D25: never invent structure the mirror doesn't have).
 */
export const zFundmomentumCheckLpCoverageArgs = z.looseObject({
    country: z.string().describe(
        "LP HQ country — a full name (e.g. 'Germany') or a two-letter " +
            "ISO code.",
    ).optional(),
    lp_type: z.string().describe(
        "LP type, e.g. 'Pension fund', 'Family office / Holding', " +
            "'Fund-of-Funds'. Common spellings ('family office') are " +
            "normalized server-side.",
    ).optional(),
});
