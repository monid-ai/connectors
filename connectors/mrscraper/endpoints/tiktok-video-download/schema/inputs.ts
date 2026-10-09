import { siteUrl, urlOnlyBody } from "../../../schema/common.ts";

/** POST /api/video/tiktok/sync body — the vendor mirror (the marketplace
 *  card via v1, 2026-09-17), gated to a TikTok video URL. */
export const zTiktokVideoDownloadBody = urlOnlyBody(siteUrl({
    site: "TikTok",
    brands: ["tiktok"],
    example: "https://www.tiktok.com/@sgweekender/video/7636779258941066504",
    pathPattern: "/[^?#]*/video/",
    pathNote: "video (/video/)",
}));
