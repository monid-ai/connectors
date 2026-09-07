import type { UsageEstimateFn } from "../schema/hooks/mod.ts";
import { preset } from "./preset.ts";

/**
 * presets.estimate.* — usage.estimate presets: the v1 EstimationLabel
 * machinery (apify limit-resolver.ts) as parametric closed terms. The
 * FIELD ALLOW-LISTS ride as preset ARGS (data, not source): tuning a list
 * changes doc bytes, never the interned fn — and the v1 lesson stands
 * (field-name discovery centralised in the caller's one list, not every
 * endpoint file).
 *
 * All presets read the caller's `input.body` (the request payload — where
 * actor-style vendors carry their knobs), never IO. Every preset returns
 * an estimated Usage in consolidate's units and NEVER throws on user
 * input: absent fields fall back to `fallback` (v1 FALLBACK_DEFAULT
 * posture). Each parametric fn is a CLOSED TERM (re-instantiated in an
 * empty scope), so the probe helpers are inlined per preset.
 */
export const estimate = {
    /** One flat CALL unit — PER_CALL endpoints (v1 basis PER_CALL). */
    perCall: preset(
        "estimate.perCall",
        (): UsageEstimateFn => () => ({
            units: [{ amount: 1, unit: "call" }],
        }),
    ),

    /** ONE_PER_QUERY: one result per query item — the sum of array lengths
     *  over the present multiplier fields, min 1. */
    onePerQuery: preset(
        "estimate.onePerQuery",
        (fields: string[]): UsageEstimateFn => ({ data }) => {
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
            return {
                units: [{ amount: Math.max(total, 1), unit: "result" }],
            };
        },
    ),

    /** LIMIT_IS_EXACT: the first present positive-integer limit field IS
     *  the expected result count; none present ⇒ `fallback`. */
    limitIsExact: preset(
        "estimate.limitIsExact",
        (fields: string[], fallback: number): UsageEstimateFn => ({ data }) => {
            const body = data.input.body;
            const rec = body !== null && typeof body === "object" &&
                    !Array.isArray(body)
                ? body as Record<string, unknown>
                : {};
            for (const field of fields) {
                const n = Number(rec[field]);
                if (Number.isFinite(n) && n > 0) {
                    return {
                        units: [{
                            amount: Math.floor(n),
                            unit: "result",
                        }],
                    };
                }
            }
            return { units: [{ amount: fallback, unit: "result" }] };
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
            if (limit === undefined) {
                return { units: [{ amount: fallback, unit: "result" }] };
            }
            let queries = 0;
            for (const field of queryFields) {
                const value = rec[field];
                if (Array.isArray(value)) queries += value.length;
            }
            return {
                units: [{
                    amount: limit * Math.max(queries, 1),
                    unit: "result",
                }],
            };
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
            if (pages === undefined) {
                return { units: [{ amount: fallback, unit: "result" }] };
            }
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
            return {
                units: [{ amount: pages * (size ?? 10), unit: "result" }],
            };
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
            if (pages === undefined) {
                return { units: [{ amount: fallback, unit: "result" }] };
            }
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
            return {
                units: [{
                    amount: pages * (size ?? 10) * Math.max(queries, 1),
                    unit: "result",
                }],
            };
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
            const body = data.input.body;
            const rec = body !== null && typeof body === "object" &&
                    !Array.isArray(body)
                ? body as Record<string, unknown>
                : {};
            for (const field of limitFields) {
                const n = Number(rec[field]);
                if (Number.isFinite(n) && n > 0) {
                    return {
                        units: [{
                            amount: Math.floor(n),
                            unit: "result",
                        }],
                    };
                }
            }
            let pages: number | undefined;
            for (const field of pageFields) {
                const n = Number(rec[field]);
                if (Number.isFinite(n) && n > 0) {
                    pages = Math.floor(n);
                    break;
                }
            }
            if (pages === undefined) {
                return { units: [{ amount: fallback, unit: "result" }] };
            }
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
            return {
                units: [{ amount: pages * (size ?? 10), unit: "result" }],
            };
        },
    ),
} as const;
