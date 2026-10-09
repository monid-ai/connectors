import { z } from "zod";
import { siteUrl } from "../../../schema/common.ts";

/** POST /api/zepto/pdp/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17), gated to its own site. */
export const zZeptoProductBody = z.object({
    url: siteUrl({
        site: "Zepto",
        brands: ["zepto"],
        example:
            "https://www.zepto.com/pn/lizol-floor-cleaner/pvid/de4cf5f8-e81e-41d3-aebc-44d019fa5f35",
        pathPattern: "(?:/[^?#]*)?/pn/",
        pathNote: "product (/pn/)",
    }),
    pincode: z.string().min(3).describe(
        "Delivery postal code that determines availability and pricing.",
    ),
}).strict();
