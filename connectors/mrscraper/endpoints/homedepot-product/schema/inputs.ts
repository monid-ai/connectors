import { z } from "zod";
import { siteUrl, zZipCode } from "../../../schema/common.ts";

/** POST /api/homedepot/pdp/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17), gated to its own site. */
export const zHomedepotProductBody = z.object({
    url: siteUrl({
        site: "Home Depot",
        brands: ["homedepot"],
        example: "https://www.homedepot.com/p/LG-Refrigerator/12345",
        pathPattern: "(?:/[^?#]*)?/p/",
        pathNote: "product (/p/)",
    }),
    zipCode: zZipCode,
}).strict();
