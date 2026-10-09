import { siteUrl, urlOnlyBody } from "../../../schema/common.ts";

/** POST /api/video/youtube/sync body — the vendor mirror (the marketplace
 *  card, docs.mrscraper.com/docs/features/marketplace, 2026-09-17), gated
 *  to a YouTube watch or shorts URL. */
export const zYoutubeVideoBody = urlOnlyBody(siteUrl({
    site: "YouTube",
    brands: ["youtube"],
    example: "https://www.youtube.com/watch?v=HeyIXwZyR8Y",
    pathPattern: "/(?:watch(?:[?#]|$)|shorts/)",
    pathNote: "watch or shorts",
}));
