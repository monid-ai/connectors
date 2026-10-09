import { z } from "zod";
import {
    zDevice,
    zFlag,
    zLanguage,
    zQuery,
} from "../../../../schema/common.ts";

/** GET /google/ads query params (litescrape.com/docs/google-ads, 2026-09-20). */
export const zGoogleAdsQueryParams = z.object({
    q: zQuery.describe("Search query, up to 2,048 characters."),
    location: z.string().min(1).max(63).describe(
        "Human-readable location the ad search originates from, such as 'Austin, Texas, United States'.",
    ),
    hl: zLanguage.describe(
        "Interface and result language, such as 'en', 'en-GB', or 'de'. Default 'en'.",
    ).optional(),
    safe: z.enum(["active", "off"]).describe(
        "Adult-content filtering.",
    ).optional(),
    nfpr: zFlag.describe(
        "Set '1' to exclude auto-corrected queries.",
    ).optional(),
    device: zDevice.describe(
        "Device layout Google renders. Default 'desktop'.",
    ).optional(),
}).strict();
