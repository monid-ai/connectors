import { z } from "zod";

// Validate the shared v4 result envelope; endpoint data is preserved verbatim.
export const zReadResult = z.looseObject({
    ok: z.literal(true),
    schemaVersion: z.literal("4"),
    requestId: z.string().optional(),
    data: z.json(),
    currency: z.string().nullable(),
    timezone: z.string(),
    asOf: z.string().nullable(),
    householdRevision: z.number().int().nonnegative(),
    quality: z.looseObject({
        state: z.enum(["complete", "partial", "unavailable"]),
        reasons: z.array(z.string()),
    }),
    evidence: z.array(
        z.looseObject({
            source: z.string(),
            id: z.string().optional(),
            observedAt: z.string().nullable(),
        }),
    ),
    page: z.looseObject({
        returnedCount: z.number().int().nonnegative(),
        totalCount: z.number().int().nonnegative().nullable(),
        truncated: z.boolean(),
        nextCursor: z.json().nullable(),
    }),
    warnings: z.array(z.string()),
    notes: z.string().optional(),
});
