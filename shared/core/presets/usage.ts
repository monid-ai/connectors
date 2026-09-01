import type { UsageConsolidateFn } from "../schema/hooks/mod.ts";
import { preset } from "./preset.ts";

/**
 * presets.usage.* — usage.consolidate presets for the common billing shapes
 * (usage.consolidate is REQUIRED on every endpoint; these kill the
 * boilerplate). They return {usage} only — output absent = unchanged.
 */
export const usage = {
    /** One flat call unit per successful run. */
    perCall: preset(
        "usage.perCall",
        (): UsageConsolidateFn => () => ({
            usage: { units: [{ amount: 1, unit: "call" }] },
        }),
    ),
    /** Units = array length at the given output path (e.g. "$.results"). */
    perResult: preset(
        "usage.perResult",
        (path: string): UsageConsolidateFn => ({ data, utils }) => ({
            usage: {
                units: [{
                    amount: utils.json.len(data.output, path),
                    unit: "result",
                }],
            },
        }),
    ),
} as const;
