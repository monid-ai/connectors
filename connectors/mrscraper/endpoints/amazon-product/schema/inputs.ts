import { siteUrl, urlOnlyBody } from "../../../schema/common.ts";

/** POST /api/amazon/pdp/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17), gated to its own site. */
export const zAmazonProductBody = urlOnlyBody(siteUrl({
    site: "Amazon",
    brands: ["amazon"],
    example: "https://www.amazon.com/dp/B0CP9YB3Q4",
    pathPattern: "(?:/[^?#]*)?(?:/dp/|/gp/product/)",
    pathNote: "product (/dp/ or /gp/product/)",
}));
