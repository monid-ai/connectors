import { z } from "zod";

/**
 * Units of measure for usage reporting — provider-NATIVE truth only (uniform
 * pricing is the hosted Broker's job). monid-services const-object pattern.
 * Append-only: extending requires an engine minor bump.
 */
export const Unit = {
    CALL: "call",
    RESULT: "result",
    TOKEN: "token",
    CHARACTER: "character",
    SECOND: "second",
    MINUTE: "minute",
    CREDIT: "credit",
    /** A charged page of results (apify#linkedin-profile-search bills per
     *  search page scraped, independent of profiles found on it). */
    PAGE: "page",
} as const;
export type Unit = (typeof Unit)[keyof typeof Unit];

export const zUnit = z.enum(Object.values(Unit) as [Unit, ...Unit[]]);

/** A number and what it counts, together. */
export const zMeasure = z.object({
    amount: z.number().nonnegative(), // v4 z.number() already rejects NaN/±Infinity (.finite() deprecated)
    unit: zUnit,
}).strict();
export type Measure = z.infer<typeof zMeasure>;
