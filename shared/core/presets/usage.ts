import type { PortableConsolidateFn } from "../schema/endpoint/typed.ts";
import { preset } from "./preset.ts";

/**
 * presets.usage.* — usage.consolidate presets for provider-seam billing
 * shapes (usage.consolidate is REQUIRED on every endpoint). They return
 * {usage} only — output absent = unchanged.
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
} as const;
