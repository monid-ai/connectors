import { z } from "zod";
import {
    zDevice,
    zGoogleLocale,
    zGoogleOrigin,
    zQuery,
} from "../../../../schema/common.ts";

/** GET /google/local query params (litescrape.com/docs/google-local, 2026-09-20). */
export const zGoogleLocalQueryParams = z.object({
    q: zQuery.describe("Local search query, up to 2,048 characters."),
    ludocid: z.string().regex(/^\d{1,128}$/).describe(
        "Google local CID to target one entity.",
    ).optional(),
    tbs: z.string().describe(
        "Google compatibility token forwarded unchanged.",
    ).optional(),
    start: z.number().int().min(0).max(10000).describe(
        "Local-result offset, 0-10,000; the source is exhausted above 1,000 and returns empty pages. Default 0.",
    ).optional(),
    ...zGoogleOrigin,
    ...zGoogleLocale,
    device: zDevice.describe(
        "Compatibility value; Maps data is device-invariant. Default 'desktop'.",
    ).optional(),
}).strict();
