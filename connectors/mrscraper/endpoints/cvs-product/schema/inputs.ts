import { z } from "zod";
import { siteUrl, zZipCode } from "../../../schema/common.ts";

/** POST /api/cvs body — the vendor mirror (the marketplace card via v1, 2026-09-17), gated to its own site. */
export const zCvsProductBody = z.object({
    url: siteUrl({
        site: "CVS",
        brands: ["cvs"],
        example: "https://www.cvs.com/shop/one-other-hand-mask-prodid-633763",
    }),
    zipCode: zZipCode.optional(),
    mode: z.enum(["pickup", "ship"]).describe(
        "Fulfillment mode that drives availability and pricing (default " +
            "'pickup').",
    ).optional(),
}).strict();
