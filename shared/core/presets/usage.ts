import type { PortableConsolidateFn } from "../schema/endpoint/typed.ts";
import { preset } from "./preset.ts";

/**
 * presets.usage.* — usage.consolidate presets for the common billing shapes
 * (usage.consolidate is REQUIRED on every endpoint; these kill the
 * boilerplate). They return {usage} only — output absent = unchanged.
 *
 * Counts are KEYED (design D19) via the doc's model (`data.model`,
 * REQUIRED on every doc) — the same switch every model consumer uses:
 * leaf PER_UNIT → the unit; COMPOSITE → the sole metered component id
 * (single-valued by the compiler's ≥2-metered rule); PER_CALL → nothing
 * countable.
 */
export const usage = {
    /** Flat per-run billing (model kind PER_CALL): nothing to count — the
     *  flat charge is fully described by the model + the success flag, so
     *  the settle reports NO counts (design D18). */
    perCall: preset(
        "usage.perCall",
        (): PortableConsolidateFn => () => ({
            usage: { counts: {} },
        }),
    ),
    /** Count = array length at the given output path (e.g. "$.results"),
     *  keyed by the doc's model. */
    perResult: preset(
        "usage.perResult",
        (path: string): PortableConsolidateFn => ({ data, utils }) => {
            let key;
            switch (data.model.kind) {
                case "PER_UNIT":
                    key = data.model.unit;
                    break;
                case "COMPOSITE":
                    key = Object.entries(data.model.components)
                        .find(([, component]) => component.kind === "PER_UNIT")
                        ?.[0];
                    break;
                case "PER_CALL":
                    key = undefined;
                    break;
            }
            const amount = utils.json.len(data.output, path);
            return {
                usage: {
                    counts: key === undefined ? {} : { [key]: amount },
                },
            };
        },
    ),
} as const;
