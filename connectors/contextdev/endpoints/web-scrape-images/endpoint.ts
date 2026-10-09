import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zScrapeImagesQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Scrape Images",
        summary: "Extract every image asset from a page with metadata.",
        description: "Find the images on any page and return them with the " +
            "element they came from, their type, and alt text — standard " +
            "URLs, inline SVGs, data URIs, responsive srcset sources, CSS " +
            "backgrounds, video posters, and embeds. Optional perceptual " +
            "de-duplication keeps only the highest-resolution copy of each " +
            "visually identical image. Useful for brand, catalog, and " +
            "content pipelines.",
        docsUrl: "https://docs.context.dev/api-reference/web-scraping/images",
        categories: ["web-extraction"],
        notes: [
            "Per-image enrichment (resolution, CDN hosting, " +
            "classification) is a 5-credit call upstream and is not " +
            "surfaced by this integration; if Context.dev ever bills " +
            "more than the list rate, the vendor's credits_consumed " +
            "claim settles the run.",
        ],
    },
    request: { method: "GET", path: "/web/scrape/images" },
    input: { schema: { queryParams: zScrapeImagesQueryParams } },
    usage: {
        /** 1 credit per call, however many images —
         *  https://www.context.dev/pricing (2026-09-17). The 5-credit
         *  enrichment variant is not reachable here (design D6). */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "scrapes",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
