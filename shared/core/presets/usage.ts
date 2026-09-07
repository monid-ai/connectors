import type { UsageConsolidateFn } from "../schema/hooks/mod.ts";
import { preset } from "./preset.ts";

/**
 * presets.usage.* — usage.consolidate presets for the common billing shapes
 * (usage.consolidate is REQUIRED on every endpoint; these kill the
 * boilerplate). They return {usage} only — output absent = unchanged.
 */
export const usage = {
    /** Flat per-run billing (model kind PER_CALL): nothing to count — the
     *  flat charge is fully described by the model + the success flag, so
     *  the settle reports NO measures (design D18). */
    perCall: preset(
        "usage.perCall",
        (): UsageConsolidateFn => () => ({
            usage: { units: [] },
        }),
    ),
    /** Units = array length at the given output path (e.g. "$.results"). */
    perResult: preset(
        "usage.perResult",
        (path: string): UsageConsolidateFn => ({ data, utils }) => ({
            usage: {
                units: [{
                    amount: utils.json.len(data.output, path),
                    unit: "RESULT",
                }],
            },
        }),
    ),
} as const;
