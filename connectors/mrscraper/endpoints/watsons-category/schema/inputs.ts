import { siteUrl, urlOnlyBody } from "../../../schema/common.ts";

/** POST /api/watsons/category/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17), gated to its own site. */
export const zWatsonsCategoryBody = urlOnlyBody(siteUrl({
    site: "Watsons",
    brands: ["watsons"],
    example:
        "https://www.watsons.com.my/health-care/vitamins-minerals/c/110100",
    pathPattern: "(?:/[^?#]*)?/c/",
    pathNote: "category (/c/)",
}));
