import { z } from "zod";

/**
 * `POST /augment/scrape` request body — mirrors Venice's
 * `WebScrapeRequest`. Optionality only (D25).
 */
export const zAugmentScrapeBody = z.object({
    url: z.string().url().describe(
        "Public http(s) URL to fetch. Private/internal addresses are " +
            "rejected.",
    ),
});
