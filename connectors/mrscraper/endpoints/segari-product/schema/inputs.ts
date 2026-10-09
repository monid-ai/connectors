import { siteUrl, urlOnlyBody } from "../../../schema/common.ts";

/** POST /api/segari/pdp/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17), gated to its own site. */
export const zSegariProductBody = urlOnlyBody(siteUrl({
    site: "Segari",
    brands: ["segari"],
    example: "https://segari.id/p/telur-ayam-kampung-curah",
    pathPattern: "(?:/[^?#]*)?/p/",
    pathNote: "product (/p/)",
}));
