import type { UsageEstimateFn } from "../schema/hooks/mod.ts";
import { preset } from "./preset.ts";

/**
 * presets.estimate.* — usage.estimate presets: the common input-derived
 * count shapes (one-per-query, exact limit, per-query limit, pages…) as
 * parametric closed terms. The FIELD NAMES ride as preset ARGS and are
 * the ENDPOINT'S OWN pinned input-schema fields — v2 endpoints carry
 * typed input schemas, so an estimate names its exact knobs
 * (`limitIsExact(["maxItems"], 3)`). v1's allow-list PROBING
 * (limit-resolver.ts: try 13 field names, first hit wins) was a
 * WORKAROUND for unpinned actor inputs and is deliberately not ported;
 * multi-field args exist only for endpoints whose schema genuinely has
 * several knobs (probe order = arg order, first present wins).
 *
 * All presets read the caller's `input.body` (the request payload — where
 * actor-style vendors carry their knobs), never IO. Every preset returns
 * an estimated Usage with consolidate's counts KEY, derived from the
 * doc's own model on `data.model` (design D19: leaf PER_UNIT → the unit;
 * COMPOSITE → the sole metered component id — single-valued by the
 * compiler's ≥2-metered rule). Presets NEVER throw on user input: absent
 * fields fall back to `fallback` (v1 FALLBACK_DEFAULT posture). Each
 * parametric fn is a CLOSED TERM (re-instantiated in an empty scope), so
 * the small helpers are inlined per preset. There is deliberately no
 * perCall preset: a PER_CALL estimate is `{counts: {}}` — the engine
 * default when no estimate fn is declared (design D18).
 */
export const estimate = {
    /** ONE_PER_QUERY: one result per query item — the sum of array lengths
     *  over the present multiplier fields, min 1. */
    onePerQuery: preset(
        "estimate.onePerQuery",
        (fields: string[]): UsageEstimateFn => ({ data }) => {
            const model = data.model;
            const key = model?.kind === "PER_UNIT"
                ? model.unit
                : model?.kind === "COMPOSITE"
                ? Object.entries(model.components)
                    .find(([, component]) => component.kind === "PER_UNIT")
                    ?.[0]
                : undefined;
            const body = data.input.body;
            const rec = body !== null && typeof body === "object" &&
                    !Array.isArray(body)
                ? body as Record<string, unknown>
                : {};
            let total = 0;
            for (const field of fields) {
                const value = rec[field];
                if (Array.isArray(value)) total += value.length;
            }
            const amount = Math.max(total, 1);
            return { counts: key === undefined ? {} : { [key]: amount } };
        },
    ),

    /** LIMIT_IS_EXACT: the first present positive-integer limit field IS
     *  the expected result count; none present ⇒ `fallback`. */
    limitIsExact: preset(
        "estimate.limitIsExact",
        (fields: string[], fallback: number): UsageEstimateFn => ({ data }) => {
            const model = data.model;
            const key = model?.kind === "PER_UNIT"
                ? model.unit
                : model?.kind === "COMPOSITE"
                ? Object.entries(model.components)
                    .find(([, component]) => component.kind === "PER_UNIT")
                    ?.[0]
                : undefined;
            const body = data.input.body;
            const rec = body !== null && typeof body === "object" &&
                    !Array.isArray(body)
                ? body as Record<string, unknown>
                : {};
            let amount = fallback;
            for (const field of fields) {
                const n = Number(rec[field]);
                if (Number.isFinite(n) && n > 0) {
                    amount = Math.floor(n);
                    break;
                }
            }
            return { counts: key === undefined ? {} : { [key]: amount } };
        },
    ),

    /** PER_QUERY_LIMIT: per-query limit × the query multiplier (sum of
     *  array lengths over `queryFields`, min 1). */
    perQueryLimit: preset(
        "estimate.perQueryLimit",
        (
            limitFields: string[],
            queryFields: string[],
            fallback: number,
        ): UsageEstimateFn =>
        ({ data }) => {
            const model = data.model;
            const key = model?.kind === "PER_UNIT"
                ? model.unit
                : model?.kind === "COMPOSITE"
                ? Object.entries(model.components)
                    .find(([, component]) => component.kind === "PER_UNIT")
                    ?.[0]
                : undefined;
            const body = data.input.body;
            const rec = body !== null && typeof body === "object" &&
                    !Array.isArray(body)
                ? body as Record<string, unknown>
                : {};
            let limit: number | undefined;
            for (const field of limitFields) {
                const n = Number(rec[field]);
                if (Number.isFinite(n) && n > 0) {
                    limit = Math.floor(n);
                    break;
                }
            }
            let amount = fallback;
            if (limit !== undefined) {
                let queries = 0;
                for (const field of queryFields) {
                    const value = rec[field];
                    if (Array.isArray(value)) queries += value.length;
                }
                amount = limit * Math.max(queries, 1);
            }
            return { counts: key === undefined ? {} : { [key]: amount } };
        },
    ),

    /** LIMIT_IS_PAGES: page count × page size. Page-size precedence (v1
     *  resolvePages): declared `resultsPerPage` (0 = undeclared) > a
     *  present page-size field > the guess of 10. No page field ⇒
     *  `fallback` results. */
    limitIsPages: preset(
        "estimate.limitIsPages",
        (
            pageFields: string[],
            sizeFields: string[],
            resultsPerPage: number,
            fallback: number,
        ): UsageEstimateFn =>
        ({ data }) => {
            const model = data.model;
            const key = model?.kind === "PER_UNIT"
                ? model.unit
                : model?.kind === "COMPOSITE"
                ? Object.entries(model.components)
                    .find(([, component]) => component.kind === "PER_UNIT")
                    ?.[0]
                : undefined;
            const body = data.input.body;
            const rec = body !== null && typeof body === "object" &&
                    !Array.isArray(body)
                ? body as Record<string, unknown>
                : {};
            let pages: number | undefined;
            for (const field of pageFields) {
                const n = Number(rec[field]);
                if (Number.isFinite(n) && n > 0) {
                    pages = Math.floor(n);
                    break;
                }
            }
            let amount = fallback;
            if (pages !== undefined) {
                let size = resultsPerPage > 0 ? resultsPerPage : undefined;
                if (size === undefined) {
                    for (const field of sizeFields) {
                        const n = Number(rec[field]);
                        if (Number.isFinite(n) && n > 0) {
                            size = Math.floor(n);
                            break;
                        }
                    }
                }
                amount = pages * (size ?? 10);
            }
            return { counts: key === undefined ? {} : { [key]: amount } };
        },
    ),

    /** PER_QUERY_PAGE_LIMIT: pages × size × the query multiplier (sum of
     *  array lengths over `queryFields`, min 1) — v1 strategyPerQueryPages. */
    perQueryPages: preset(
        "estimate.perQueryPages",
        (
            pageFields: string[],
            sizeFields: string[],
            queryFields: string[],
            resultsPerPage: number,
            fallback: number,
        ): UsageEstimateFn =>
        ({ data }) => {
            const model = data.model;
            const key = model?.kind === "PER_UNIT"
                ? model.unit
                : model?.kind === "COMPOSITE"
                ? Object.entries(model.components)
                    .find(([, component]) => component.kind === "PER_UNIT")
                    ?.[0]
                : undefined;
            const body = data.input.body;
            const rec = body !== null && typeof body === "object" &&
                    !Array.isArray(body)
                ? body as Record<string, unknown>
                : {};
            let pages: number | undefined;
            for (const field of pageFields) {
                const n = Number(rec[field]);
                if (Number.isFinite(n) && n > 0) {
                    pages = Math.floor(n);
                    break;
                }
            }
            let amount = fallback;
            if (pages !== undefined) {
                let size = resultsPerPage > 0 ? resultsPerPage : undefined;
                if (size === undefined) {
                    for (const field of sizeFields) {
                        const n = Number(rec[field]);
                        if (Number.isFinite(n) && n > 0) {
                            size = Math.floor(n);
                            break;
                        }
                    }
                }
                let queries = 0;
                for (const field of queryFields) {
                    const value = rec[field];
                    if (Array.isArray(value)) queries += value.length;
                }
                amount = pages * (size ?? 10) * Math.max(queries, 1);
            }
            return { counts: key === undefined ? {} : { [key]: amount } };
        },
    ),

    /** DUAL_LIMIT: an explicit total limit wins; else pages × size; else
     *  `fallback` (v1 strategyDual). */
    dualLimit: preset(
        "estimate.dualLimit",
        (
            limitFields: string[],
            pageFields: string[],
            sizeFields: string[],
            resultsPerPage: number,
            fallback: number,
        ): UsageEstimateFn =>
        ({ data }) => {
            const model = data.model;
            const key = model?.kind === "PER_UNIT"
                ? model.unit
                : model?.kind === "COMPOSITE"
                ? Object.entries(model.components)
                    .find(([, component]) => component.kind === "PER_UNIT")
                    ?.[0]
                : undefined;
            const body = data.input.body;
            const rec = body !== null && typeof body === "object" &&
                    !Array.isArray(body)
                ? body as Record<string, unknown>
                : {};
            let amount: number | undefined;
            for (const field of limitFields) {
                const n = Number(rec[field]);
                if (Number.isFinite(n) && n > 0) {
                    amount = Math.floor(n);
                    break;
                }
            }
            if (amount === undefined) {
                let pages: number | undefined;
                for (const field of pageFields) {
                    const n = Number(rec[field]);
                    if (Number.isFinite(n) && n > 0) {
                        pages = Math.floor(n);
                        break;
                    }
                }
                if (pages === undefined) {
                    amount = fallback;
                } else {
                    let size = resultsPerPage > 0 ? resultsPerPage : undefined;
                    if (size === undefined) {
                        for (const field of sizeFields) {
                            const n = Number(rec[field]);
                            if (Number.isFinite(n) && n > 0) {
                                size = Math.floor(n);
                                break;
                            }
                        }
                    }
                    amount = pages * (size ?? 10);
                }
            }
            return { counts: key === undefined ? {} : { [key]: amount } };
        },
    ),
} as const;
