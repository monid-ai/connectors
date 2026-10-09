import { siteUrl, urlOnlyBody } from "../../../schema/common.ts";

/** POST /api/1688/cbc/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17), gated to its own site. */
export const z1688CategoryBody = urlOnlyBody(siteUrl({
    site: "1688",
    brands: ["1688"],
    example: "https://s.1688.com/selloffer/offer_search.htm?keywords=phone",
}));
