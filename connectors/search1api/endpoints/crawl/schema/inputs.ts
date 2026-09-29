import { z } from "zod";

/** `POST /crawl` request body — the OpenAPI object, optionality only. */
export const zCrawlBody = z.object({
    url: z.string().min(1).describe("Public page URL to crawl."),
    enableFallback: z.boolean().optional().describe(
        "Fall back to the vendor's alternate crawler when the primary " +
            "fetch fails (vendor default true).",
    ),
}).strict();
