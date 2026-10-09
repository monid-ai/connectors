import { siteUrl, urlOnlyBody } from "../../../schema/common.ts";

/** POST /api/nordstrom/pdp/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17), gated to its own site. */
export const zNordstromProductBody = urlOnlyBody(siteUrl({
    site: "Nordstrom",
    brands: ["nordstrom"],
    example: "https://www.nordstrom.com/s/ultra-soft-zip-jacket/8036333",
    pathPattern: "(?:/[^?#]*)?/s/",
    pathNote: "product (/s/)",
}));
