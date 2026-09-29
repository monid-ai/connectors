import { z } from "zod";

/** `POST /sitemap` request body — the OpenAPI object, optionality only. */
export const zSitemapBody = z.object({
    url: z.string().min(1).describe("Public URL or domain to map."),
    type: z.enum(["sitemap", "all"]).optional().describe(
        "'sitemap' reads the site's published sitemap; 'all' discovers " +
            "every reachable link the vendor can find (vendor default " +
            "'sitemap').",
    ),
}).strict();
