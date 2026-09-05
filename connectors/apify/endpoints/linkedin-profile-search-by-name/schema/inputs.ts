import { z } from "zod";

/**
 * harvestapi/linkedin-profile-search-by-name — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/harvestapi~linkedin-profile-search-by-name/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zLinkedinProfileSearchByNameBody = z.object({
    "profileScraperMode": z.enum(["Short", "Full", "Full + email search"])
        .describe(
            "Choose the mode for scraping LinkedIn profiles. The Short mode provides basic information, while the Full mode includes full detailed profile data.",
        ),
    "firstName": z.string().describe("First name of the person to search for.")
        .optional(),
    "lastName": z.string().describe("Last name of the person to search for.")
        .optional(),
    "strictSearch": z.boolean().describe(
        "Enabling strict search will ensure that only profiles matching both the first and last names exactly are returned.",
    ).optional(),
    "maxPages": z.number().int().min(1).max(100).describe(
        "Maximum number of pages to scrape for each query. The actor will stop scraping when this limit is reached.",
    ).optional(),
    "locations": z.array(z.any()).describe(
        'Filter Profiles by these LinkedIn locations. Example: `San Francisco`. LinkedIn does not always understand your text queries. For example for "UK" query it will apply "Ukraine" location, so you should use "United Kingdom" in this case. Try this out first in the location filter input of LinkedIn s...',
    ).optional(),
    "currentCompanies": z.array(z.any()).describe(
        "Filter Profiles by these LinkedIn companies. Provide full LinkedIn URLs",
    ).optional(),
    "pastCompanies": z.array(z.any()).describe(
        "Filter Profiles by these LinkedIn past companies. Provide full LinkedIn URLs",
    ).optional(),
    "schools": z.array(z.any()).describe(
        "Filter Profiles by these LinkedIn schools. Example: `Stanford University`.",
    ).optional(),
    "currentJobTitles": z.array(z.any()).describe(
        "Filter Profiles by these LinkedIn current job titles. Example: `Software Engineer`.",
    ).optional(),
    "industryIds": z.array(z.any()).describe(
        "Filter Profiles by these LinkedIn industry IDs. Example: `4` for 'Software Development'. Full list: `https://github.com/HarvestAPI/linkedin-industry-codes-v2/blob/main/linkedin_industry_code_v2_all_eng_with_header.csv`",
    ).optional(),
    "maxItems": z.number().int().describe(
        "Maximum number of profiles to scrape. The actor will stop scraping when this limit is reached.",
    ).optional(),
});
