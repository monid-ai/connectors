import { siteUrl, urlOnlyBody } from "../../../schema/common.ts";

/** POST /api/sns/tiktok/video/sync body — the vendor mirror (the
 *  marketplace card via v1, 2026-09-17), gated to a TikTok video URL. */
export const zTiktokVideoBody = urlOnlyBody(siteUrl({
    site: "TikTok",
    brands: ["tiktok"],
    example: "https://www.tiktok.com/@mrbeast/video/7670199761282075935",
    pathPattern: "/[^?#]*/video/",
    pathNote: "video (/video/)",
}));
