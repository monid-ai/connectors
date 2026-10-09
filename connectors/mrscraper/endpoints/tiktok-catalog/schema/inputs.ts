import { siteUrl, urlOnlyBody } from "../../../schema/common.ts";

/** POST /api/tiktok/web/catalog/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17), gated to its own site. */
export const zTiktokCatalogBody = urlOnlyBody(siteUrl({
    site: "TikTok Shop",
    brands: ["tiktok"],
    example: "https://www.tiktok.com/shop/sg/c/cases-screen-protectors/601925",
    pathPattern: "(?:/[^?#]*)?/shop/",
    pathNote: "shop (/shop/)",
}));
