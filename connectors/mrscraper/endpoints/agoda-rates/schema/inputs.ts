import { z } from "zod";
import { siteUrl } from "../../../schema/common.ts";

/** POST /api/hotels/agoda/rates/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17), gated to its own site. */
const zAgodaUrl = siteUrl({
    site: "Agoda",
    brands: ["agoda"],
    example:
        "https://www.agoda.com/ad-lib-bangkok/hotel/bangkok-th.html?checkIn=2026-10-14&los=1&adults=2",
});

export const zAgodaRatesBody = z.object({
    url: zAgodaUrl.describe(
        "Full Agoda hotel page URL carrying the stay parameters " +
            "(checkIn, los, adults, rooms, children, currencyCode).",
    ),
    proxyCountry: z.string().length(2).describe(
        "Two-letter country code to route the request through; affects " +
            "the prices and availability Agoda shows (default 'th').",
    ).optional(),
}).strict();
