import { z } from "zod";
import { siteUrl, zZipCode } from "../../../schema/common.ts";

/** POST /api/kroger/pdp/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17), gated to its own site. */
export const zKrogerProductBody = z.object({
    url: siteUrl({
        site: "Kroger",
        brands: ["kroger"],
        example: "https://www.kroger.com/p/chicken-breasts/0027061550000",
        pathPattern: "(?:/[^?#]*)?/p/",
        pathNote: "product (/p/)",
    }),
    zipCode: zZipCode.optional(),
}).strict();
