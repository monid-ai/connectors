import { z } from "zod";

/**
 * Model selector — WHERE a card-keying coordinate lives on the REQUEST
 * (port of v1 zPriceSelector, rate-free). Used by the VARIANT kind:
 * request-side coordinates that SELECT which services card row prices the
 * unit. Request-side by nature — v1's `output` location existed for
 * TIERED's response-side counters, and TIERED is deleted (its rate
 * schedules are card rows now, not doc facts — design D18).
 */
export const zModelSelector = z.strictObject({
    /** Human-readable label for display, e.g. "Resolution". */
    label: z.string().min(1),
    /** Dot-path into the source, e.g. "resolution" or "video.quality". */
    key: z.string().min(1),
    in: z.enum(["body", "queryParam", "pathParam"]),
});
export type ModelSelector = z.infer<typeof zModelSelector>;
