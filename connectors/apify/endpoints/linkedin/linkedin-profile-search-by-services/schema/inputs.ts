import { z } from "zod";

/**
 * harvestapi/linkedin-profile-search-by-services — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/harvestapi~linkedin-profile-search-by-services/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zLinkedinProfileSearchByServicesBody = z.object({
    "profileScraperMode": z.enum(["Short", "Full", "Full + email search"])
        .describe(
            "Choose the mode for scraping LinkedIn profiles. The Short mode provides basic information, while the Full mode includes full detailed profile data.",
        ).optional(),
    "search": z.string().describe(
        "Query to search LinkedIn profiles. (e.g., `Founder`, `Marketing Manager`, `John Doe`). [The query supports search operators](https://www.linkedin.com/help/linkedin/answer/a524335)",
    ).optional(),
    "maxItems": z.number().int().describe(
        "Maximum number of profiles to scrape. The actor will stop scraping when this limit is reached.",
    ).optional(),
    "locations": z.array(z.any()).describe(
        'Filter Profiles by these LinkedIn locations. Example: `San Francisco`. LinkedIn does not always understand your text queries. For example for "UK" query it will apply "Ukraine" location, so you should use "United Kingdom" in this case. Try this out first in the location filter input of LinkedIn s...',
    ).optional(),
    "startPage": z.number().int().min(1).max(100).describe(
        "The page number to start scraping from.",
    ).optional(),
    "takePages": z.number().int().min(0).max(100).describe(
        "The number of search pages to scrape. Each page contains 25 profiles.",
    ).optional(),
});
