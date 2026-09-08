import type { UsageConsolidateFn } from "../schema/hooks/mod.ts";
import { preset } from "./preset.ts";

/**
 * presets.usage.* — usage.consolidate presets for the common billing shapes
 * (usage.consolidate is REQUIRED on every endpoint; these kill the
 * boilerplate). They return {usage} only — output absent = unchanged.
 *
 * Counts are KEYED (design D19): the key is derived from the doc's OWN
 * model, which rides in on `data.model` — leaf PER_UNIT → the unit;
 * COMPOSITE → the sole metered component id (single-valued by the
 * compiler's ≥2-metered rule, which forces doc-level fns otherwise).
 */
export const usage = {
    /** Flat per-run billing (model kind PER_CALL): nothing to count — the
     *  flat charge is fully described by the model + the success flag, so
     *  the settle reports NO counts (design D18). */
    perCall: preset(
        "usage.perCall",
        (): UsageConsolidateFn => () => ({
            usage: { counts: {} },
        }),
    ),
    /** Count = array length at the given output path (e.g. "$.results"),
     *  keyed by the doc's model (unit / sole metered component id). */
    perResult: preset(
        "usage.perResult",
        (path: string): UsageConsolidateFn => ({ data, utils }) => {
            const model = data.model;
            const key = model?.kind === "PER_UNIT"
                ? model.unit
                : model?.kind === "COMPOSITE"
                ? Object.entries(model.components)
                    .find(([, component]) => component.kind === "PER_UNIT")
                    ?.[0]
                : undefined;
            const amount = utils.json.len(data.output, path);
            return {
                usage: {
                    counts: key === undefined ? {} : { [key]: amount },
                },
            };
        },
    ),
} as const;
