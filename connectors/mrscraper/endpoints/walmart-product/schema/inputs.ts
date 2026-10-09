import { z } from "zod";
import { siteUrl } from "../../../schema/common.ts";

/** POST /api/walmart/pdp/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17), gated to its own site. */
export const zWalmartProductBody = z.object({
    url: siteUrl({
        site: "Walmart",
        brands: ["walmart"],
        example: "https://www.walmart.com/ip/HP-14-Laptop/17581855155",
        pathPattern: "(?:/[^?#]*)?/ip/",
        pathNote: "product (/ip/)",
    }),
    zipCode: z.string().min(3).describe(
        "US zip code used to determine local product availability.",
    ).optional(),
    storeId: z.string().min(1).describe(
        "Walmart store ID for localized inventory.",
    ).optional(),
    country: z.string().length(2).describe(
        "Walmart marketplace country code, e.g. 'us', 'ca', 'mx' " +
            "(default 'us').",
    ).optional(),
}).strict();
