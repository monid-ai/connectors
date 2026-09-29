import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCrawlBody } from "./schema/inputs.ts";

/**
 * `POST /crawl` — one public URL in, clean Markdown out. Flat 1 credit
 * per call ⇒ leaf PER_CALL.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search1API Page Crawl",
        summary: "Retrieve one public URL as clean Markdown.",
        description: "Crawl one public URL and get its page content as " +
            "clean Markdown ({title, link, content, metadata}). Use after " +
            "`search1api#search` / `#news` when a result's snippet is " +
            "promising but too short, or when handed a URL to read. " +
            "`enableFallback` retries through the vendor's alternate " +
            "crawler when the primary fetch fails. Markdown only — no " +
            "raw-HTML or rendered-DOM output; for a site's link structure " +
            "use `search1api#sitemap`.",
        docsUrl: "https://s1.dev/docs/basic/crawl",
        categories: ["web-extraction"],
        notes: ["1 Search1API credit per call."],
    },
    request: { method: "POST", path: "/crawl" },
    input: { schema: { body: zCrawlBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "crawl calls",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
