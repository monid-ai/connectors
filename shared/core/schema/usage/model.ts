import { z } from "zod";
import { zUnit } from "./unit.ts";

/**
 * usage.model — the RATE-FREE vendor cost-shape declaration: WHAT an
 * endpoint's consumption looks like, never what it costs (rates live in
 * the hosted catalog, not the doc — a price change must not recompile a
 * doc). Mirrors v1's authoring-legal price kinds (services/shared/models/
 * price): PER_CALL, PER_RESULT (+flatFee → `startWith`), PER_UNIT
 * (absorbing the deprecated METERED — duration is `unit: SECOND|MINUTE`),
 * PER_UNIT_MATRIX, TIERED. Deliberately absent:
 *   - METERED: v1 deprecated it in place ("author a standalone PER_UNIT
 *     with unit second instead"; def coherence rejects authoring it).
 *   - BY_PERIOD: resource/renewal pricing, out of run scope.
 *   - a "composite" kind: matrix/tiered ARE the composite kinds, and
 *     multi-measure consumption is already `zUsage.units` being an array
 *     (`[{1, CALL}, {n, RESULT}]`).
 */

/** WHERE a pricing-relevant value lives — port of v1 zPriceSelector
 *  (price/selector.ts), rate-free. `output` reads exist for tiered
 *  quantities only (response-side usage counters — absent at admission). */
export const zModelSelector = z.strictObject({
    /** Human-readable label for display, e.g. "Resolution". */
    label: z.string().min(1),
    /** Dot-path into the source, e.g. "meta.usage.tokens". */
    key: z.string().min(1),
    in: z.enum(["body", "queryParam", "pathParam", "output"]),
    /** Quantity reads only: units not metered by this selector —
     *  `quantity = max(0, value - offset)` ("first N covered"). */
    offset: z.number().int().nonnegative().optional(),
});
export type ModelSelector = z.infer<typeof zModelSelector>;

export const zUsageModel = z.discriminatedUnion("kind", [
    /** One flat charge per run (v1 PER_CALL). */
    z.strictObject({ kind: z.literal("per_call") }),
    /** Charged per returned result (v1 PER_RESULT). */
    z.strictObject({
        kind: z.literal("per_result"),
        /** Base-fee component (v1 PER_RESULT.flatFee / Apify's actor-start
         *  charge event): cost STARTS WITH one CALL, then meters RESULTs —
         *  consolidate/estimate report `[{1, CALL}, {n, RESULT}]`. */
        startWith: z.literal("call").optional(),
    }),
    /** Charged per vendor-native unit (v1 PER_UNIT; duration pricing =
     *  `unit: SECOND|MINUTE` — the retired METERED). */
    z.strictObject({
        kind: z.literal("per_unit"),
        unit: zUnit,
        startWith: z.literal("call").optional(),
    }),
    /** Request-side coordinates select the price VARIANT at admission
     *  (v1 PER_UNIT_MATRIX); an unmatched request is unpriceable —
     *  admission rejects it (v1 MatrixUnmatchedError posture). */
    z.strictObject({
        kind: z.literal("unit_matrix"),
        selectors: z.array(zModelSelector).min(1),
        unit: zUnit,
    }),
    /** Quantities metered against a rate card (v1 TIERED) — request- or
     *  response-side counters, with per-selector `offset`. */
    z.strictObject({
        kind: z.literal("tiered"),
        quantities: z.array(zModelSelector).min(1),
        startWith: z.literal("call").optional(),
    }),
]);
export type UsageModel = z.infer<typeof zUsageModel>;
