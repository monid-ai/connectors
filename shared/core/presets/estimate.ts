import type { UsageEstimateFn } from "../schema/hooks/mod.ts";
import { preset } from "./preset.ts";

/**
 * presets.estimate.* — usage.estimate presets: the common input-derived
 * count shapes as parametric closed terms. RULES (design D19 addendum):
 *
 *   - A preset earns its existence by BEING SHARED (≥2 call sites) with a
 *     plain signature — oddly-specific counting logic lives as an inline
 *     fn on its doc (perQueryPages/limitIsPages/dualLimit were single-use
 *     or dead and are gone).
 *   - Args are SINGLE fields (`limitField`, `queryField`) naming the
 *     endpoint's OWN pinned input-schema knobs — v1's allow-list probing
 *     is not ported, and multi-knob docs write inline estimates.
 *   - The counts KEY derives from the doc's model (`data.model`, REQUIRED
 *     on every doc) via the same switch every model consumer uses: leaf
 *     PER_UNIT → the unit; COMPOSITE → the sole metered component id
 *     (single-valued by the compiler's ≥2-metered rule). The PER_CALL arm
 *     is defensive only — typed docs cannot declare an estimate on a flat
 *     model at all.
 *
 * All presets read the caller's `input.body` (validated BEFORE any hook —
 * schema defaults are materialized into it), never IO; absent fields fall
 * back to `fallback` (v1 FALLBACK_DEFAULT posture). Each parametric fn is
 * a CLOSED TERM (re-instantiated in an empty scope). There is no perCall
 * preset: a PER_CALL estimate is `{counts: {}}` — the engine default when
 * no estimate fn is declared (design D18).
 */
export const estimate = {
    /** ONE_PER_QUERY: one result per entry of the query array, min 1. */
    onePerQuery: preset(
        "estimate.onePerQuery",
        (queryField: string): UsageEstimateFn => ({ data }) => {
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
            const body = data.input.body;
            const rec = body !== null && typeof body === "object" &&
                    !Array.isArray(body)
                ? body as Record<string, unknown>
                : {};
            const value = rec[queryField];
            const amount = Math.max(Array.isArray(value) ? value.length : 0, 1);
            return { counts: key === undefined ? {} : { [key]: amount } };
        },
    ),

    /** LIMIT_IS_EXACT: the limit field IS the expected count; absent ⇒
     *  `fallback`. */
    limitIsExact: preset(
        "estimate.limitIsExact",
        (limitField: string, fallback: number): UsageEstimateFn =>
        (
            { data },
        ) => {
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
            const body = data.input.body;
            const rec = body !== null && typeof body === "object" &&
                    !Array.isArray(body)
                ? body as Record<string, unknown>
                : {};
            const n = Number(rec[limitField]);
            const amount = Number.isFinite(n) && n > 0
                ? Math.floor(n)
                : fallback;
            return { counts: key === undefined ? {} : { [key]: amount } };
        },
    ),

    /** PER_QUERY_LIMIT: per-query limit × the query-array length (min 1);
     *  absent limit ⇒ `fallback` total. */
    perQueryLimit: preset(
        "estimate.perQueryLimit",
        (
            limitField: string,
            queryField: string,
            fallback: number,
        ): UsageEstimateFn =>
        ({ data }) => {
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
            const body = data.input.body;
            const rec = body !== null && typeof body === "object" &&
                    !Array.isArray(body)
                ? body as Record<string, unknown>
                : {};
            const n = Number(rec[limitField]);
            let amount;
            if (Number.isFinite(n) && n > 0) {
                const value = rec[queryField];
                const queries = Math.max(
                    Array.isArray(value) ? value.length : 0,
                    1,
                );
                amount = Math.floor(n) * queries;
            } else {
                amount = fallback;
            }
            return { counts: key === undefined ? {} : { [key]: amount } };
        },
    ),
} as const;
