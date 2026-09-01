import { z } from "zod";

/** Fully-resolved timeouts (compiled docs). */
export const zTimeouts = z.strictObject({
    requestMs: z.number().int().positive(),
    runMs: z.number().int().positive(),
});
export type Timeouts = z.infer<typeof zTimeouts>;

/** The shared SECTION shape (author-side partial) — falls back endpoint ??
 *  provider ?? config defaults. (Not "Seed": that term is reserved for the
 *  z.input def types.) */
export const zTimeoutsSection = z.strictObject({
    requestMs: z.number().int().positive().optional(),
    runMs: z.number().int().positive().optional(),
});
export type TimeoutsSection = z.infer<typeof zTimeoutsSection>;
