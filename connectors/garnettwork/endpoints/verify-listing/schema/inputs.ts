import { z } from "zod";

export const zVerifyListingBody = z.strictObject({
    url: z.url().describe(
        "eBay US Buy It Now PS5 Disc listing URL. The service verifies listing identity and supported scope.",
    ),
    intent: z.literal("BUY").describe("Required intent; no implicit default."),
    destination: z.strictObject({
        country: z.literal("US").describe("Destination country."),
        postal_code: z.string().regex(/^\d{5}(?:-\d{4})?$/).describe(
            "US ZIP or ZIP+4 for destination-sensitive shipping; not a checkout tax guarantee.",
        ),
    }).optional(),
});
