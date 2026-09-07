import { z } from "zod";
import { extractZodDiscriminatorKeys } from "../../zod-util.ts";
import { PER_CALL_MODEL_KIND, zPerCallModel } from "./per-call.ts";
import { PER_UNIT_MODEL_KIND, zPerUnitModel } from "./per-unit.ts";
import { COMPOSITE_MODEL_KIND, zCompositeModel } from "./composite.ts";
import { VARIANT_MODEL_KIND, zVariantModel } from "./variant.ts";

/**
 * usage.model — the RATE-FREE billing-shape ALGEBRA: WHAT an endpoint's
 * consumption looks like, never what it costs (rates live in the hosted
 * rate card, keyed by endpoint + OUR account tier — verified necessary:
 * apify event prices are tiered by subscription plan). Three orthogonal
 * operators (design D18):
 *
 *   - LEAF:      PER_CALL (flat — the run is the product, billed 1 iff
 *                success, no measure) and PER_UNIT (metered — billed per
 *                N of `unit`).
 *   - AND:       COMPOSITE — the sum of scalar components (flat start fee
 *                AND per-item metering).
 *   - SELECT:    VARIANT — request coordinates pick WHICH card row prices
 *                the unit (exactly one active).
 *
 * Deliberately absent: TIERED — volume schedules ("first 1k tokens at X")
 * are a shape of the services CARD ROW, invisible to a rate-free doc; the
 * doc's only job is naming the quantities, which PER_UNIT/COMPOSITE do.
 */
export const zUsageModel = z.discriminatedUnion("kind", [
    zPerCallModel,
    zPerUnitModel,
    zCompositeModel,
    zVariantModel,
]);
export type UsageModel = z.infer<typeof zUsageModel>;

// The RUNTIME kind enum is DERIVED from the union (v1 zPriceTypes
// pattern) — validation can never go stale against the union.
const kinds = extractZodDiscriminatorKeys(zUsageModel, "kind");
export const zUsageModelKind = z.enum(
    kinds as [UsageModelKind, ...UsageModelKind[]],
    { message: "Invalid usage model kind" },
);

/** The authoring const — LITERAL-typed (each member keeps its exact kind,
 *  so `UsageModelKind.PER_UNIT` discriminates the union at compile time;
 *  an Object.fromEntries derivation would widen every member). Built from
 *  the same per-file KIND constants the union is; the load-time assert
 *  below keeps it provably in sync with the DERIVED enum. */
export const UsageModelKind = {
    PER_CALL: PER_CALL_MODEL_KIND,
    PER_UNIT: PER_UNIT_MODEL_KIND,
    COMPOSITE: COMPOSITE_MODEL_KIND,
    VARIANT: VARIANT_MODEL_KIND,
} as const;
export type UsageModelKind =
    (typeof UsageModelKind)[keyof typeof UsageModelKind];

// Staleness guard (module load, hit by every test run): a kind added to
// the union without a const member — or vice versa — fails immediately.
const constKinds = Object.values(UsageModelKind);
if (
    kinds.length !== constKinds.length ||
    !kinds.every((kind) => constKinds.includes(kind))
) {
    throw new Error(
        "UsageModelKind const is stale against the zUsageModel union",
    );
}

export * from "./selector.ts";
export * from "./per-call.ts";
export * from "./per-unit.ts";
export * from "./scalar.ts";
export * from "./composite.ts";
export * from "./variant.ts";
