import { z } from "zod";

/**
 * `search_funds` tool arguments (fundmomentum.vc, README "Tool
 * reference", 2026-10). Mirror carries optionality only (D25): the
 * vendor normalizes common spellings of `stage`/`industry` server-side
 * ("Pre-Seed" → `pre_seed`, "AI/ML" → `ai_ml`), so this stays a plain
 * string rather than a fabricated closed enum — the real enum is not
 * published. `country` is spelled out in full here (not an ISO code,
 * per the vendor's own docs); `limit` bounds (1–20, default 10) live at
 * the binding in endpoint.ts. `z.looseObject`: vendor-forward keys ride
 * through.
 */
export const zFundmomentumSearchFundsArgs = z.looseObject({
    stage: z.string().describe(
        "Funding stage, e.g. 'seed', 'pre_seed', 'series_a'. Common " +
            "spellings ('Pre-Seed') are normalized server-side.",
    ).optional(),
    country: z.string().describe(
        "Fund HQ country, spelled out in full (e.g. 'Germany'), not " +
            "an ISO code.",
    ).optional(),
    industry: z.string().describe(
        "Investment focus, e.g. 'ai_ml', 'climate_sustainability', " +
            "'b2b_saas'. Common spellings ('AI/ML') are normalized " +
            "server-side.",
    ).optional(),
    limit: z.number().int().describe(
        "Maximum number of funds to return (1–20). Default 10.",
    ).optional(),
});
