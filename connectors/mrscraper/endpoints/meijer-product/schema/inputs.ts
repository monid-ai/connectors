import { z } from "zod";
import { siteUrl, zZipCode } from "../../../schema/common.ts";

/** POST /api/meijer/pdp/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17), gated to its own site. */
export const zMeijerProductBody = z.object({
    url: siteUrl({
        site: "Meijer",
        brands: ["meijer"],
        example:
            "https://www.meijer.com/shopping/product/highlighters-4pk/71928356637.html",
        pathPattern: "(?:/[^?#]*)?/shopping/product/",
        pathNote: "product (/shopping/product/)",
    }),
    zipCode: zZipCode.optional(),
}).strict();
