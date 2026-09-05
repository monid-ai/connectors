import { z } from "zod";

/**
 * harvestapi/linkedin-profile-search — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/harvestapi~linkedin-profile-search/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zLinkedinProfileSearchBody = z.object({
    // curated: REQUIRED (v1 admission rule) — each mode is priced separately
    // ($0 / $0.004 / $0.01 per profile on top of $0.10 per search page) and
    // there is no default rate to silently fall back to.
    "profileScraperMode": z.enum(["Short", "Full", "Full + email search"])
        .describe(
            "Choose the mode for scraping LinkedIn profiles. The Short mode provides basic information, while the Full mode includes full detailed profile data. REQUIRED: each mode is priced separately.",
        ),
    "searchQuery": z.string().describe(
        "Query to search LinkedIn profiles. (e.g., `Founder`, `Marketing Manager`, `John Doe`). [The query supports search operators](https://www.linkedin.com/help/linkedin/answer/a524335)",
    ).optional(),
    "maxItems": z.number().int().describe(
        "Maximum number of profiles to scrape. The actor will stop scraping when this limit is reached.",
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
    "pastJobTitles": z.array(z.any()).describe(
        "Filter Profiles by these LinkedIn past job titles. Example: `Software Engineer`.",
    ).optional(),
    "yearsOfExperienceIds": z.array(z.enum(["1", "2", "3", "4", "5"])).describe(
        "Filter Profiles by these LinkedIn years of experience IDs. Example: `3` for '3 to 5 years'.",
    ).optional(),
    "yearsAtCurrentCompanyIds": z.array(z.enum(["1", "2", "3", "4", "5"]))
        .describe(
            "Filter Profiles by these LinkedIn years at current company IDs. Example: `3` for '3 to 5 years'.",
        ).optional(),
    "seniorityLevelIds": z.array(
        z.enum([
            "100",
            "110",
            "120",
            "130",
            "200",
            "210",
            "220",
            "300",
            "310",
            "320",
        ]),
    ).describe(
        "Filter Profiles by these LinkedIn seniority level IDs. Example: `120` for 'Senior'.",
    ).optional(),
    "functionIds": z.array(
        z.enum([
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "11",
            "12",
            "13",
            "14",
            "15",
            "16",
            "17",
            "18",
            "19",
            "20",
            "21",
            "22",
            "23",
            "24",
            "25",
            "26",
        ]),
    ).describe(
        "Filter Profiles by these LinkedIn function IDs. Example: `8` for 'Engineering'.",
    ).optional(),
    "industryIds": z.array(z.any()).describe(
        "Filter Profiles by these LinkedIn industry IDs. Example: `4` for 'Software Development'. Full list: `https://github.com/HarvestAPI/linkedin-industry-codes-v2/blob/main/linkedin_industry_code_v2_all_eng_with_header.csv`",
    ).optional(),
    "firstNames": z.array(z.any()).describe(
        "Filter Profiles by these LinkedIn first names. We recommend using another actor for searches by name: https://apify.com/harvestapi/linkedin-profile-search-by-name",
    ).optional(),
    "lastNames": z.array(z.any()).describe(
        "Filter Profiles by these LinkedIn last names. We recommend using another actor for searches by name: https://apify.com/harvestapi/linkedin-profile-search-by-name",
    ).optional(),
    "profileLanguages": z.array(
        z.enum([
            "Arabic",
            "English",
            "Spanish",
            "Portuguese",
            "Chinese",
            "French",
            "Italian",
            "Russian",
            "German",
            "Dutch",
            "Turkish",
            "Tagalog",
            "Polish",
            "Korean",
            "Japanese",
            "Malay",
            "Norwegian",
            "Danish",
            "Romanian",
            "Swedish",
            "Bahasa Indonesia",
            "Czech",
        ]),
    ).describe("Filter Profiles by these LinkedIn profile languages.")
        .optional(),
    "companyHeadcount": z.array(
        z.enum(["A", "B", "C", "D", "E", "F", "G", "H", "I"]),
    ).describe("Filter Profiles by their current company's headcount.")
        .optional(),
    "companyHeadquarterLocations": z.array(z.any()).describe(
        "Filter Profiles by their current company's headquarter location.",
    ).optional(),
    "recentlyChangedJobs": z.boolean().describe(
        "Filter Profiles to only those who have changed jobs in the last 90 days.",
    ).optional(),
    "recentlyPostedOnLinkedIn": z.boolean().describe(
        "Filter Profiles to only those who have posted on LinkedIn in the last 30 days.",
    ).optional(),
    "excludeLocations": z.array(z.any()).describe(
        'Exclude Profiles by these LinkedIn locations. Example: `San Francisco`. LinkedIn does not always understand your text queries. For example for "UK" query it will apply "Ukraine" location, so you should use "United Kingdom" in this case. Try this out first in the location filter input of LinkedIn ...',
    ).optional(),
    "excludeCurrentCompanies": z.array(z.any()).describe(
        "Exclude Profiles by these LinkedIn companies. Provide full LinkedIn URLs",
    ).optional(),
    "excludePastCompanies": z.array(z.any()).describe(
        "Exclude Profiles by these LinkedIn past companies. Provide full LinkedIn URLs",
    ).optional(),
    "excludeSchools": z.array(z.any()).describe(
        "Exclude Profiles by these LinkedIn schools. Example: `Stanford University`.",
    ).optional(),
    "excludeCurrentJobTitles": z.array(z.any()).describe(
        "Exclude Profiles by these LinkedIn current job titles. Example: `Software Engineer`.",
    ).optional(),
    "excludePastJobTitles": z.array(z.any()).describe(
        "Exclude Profiles by these LinkedIn past job titles. Example: `Software Engineer`.",
    ).optional(),
    "excludeIndustryIds": z.array(z.any()).describe(
        "Exclude Profiles by these LinkedIn industry IDs. Example: `4` for 'Software Development'. Full list: `https://github.com/HarvestAPI/linkedin-industry-codes-v2/blob/main/linkedin_industry_code_v2_all_eng_with_header.csv`",
    ).optional(),
    "excludeSeniorityLevelIds": z.array(
        z.enum([
            "100",
            "110",
            "120",
            "130",
            "200",
            "210",
            "220",
            "300",
            "310",
            "320",
        ]),
    ).describe(
        "Filter Profiles by these LinkedIn seniority level IDs. Example: `120` for 'Senior'.",
    ).optional(),
    "excludeFunctionIds": z.array(
        z.enum([
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "11",
            "12",
            "13",
            "14",
            "15",
            "16",
            "17",
            "18",
            "19",
            "20",
            "21",
            "22",
            "23",
            "24",
            "25",
            "26",
        ]),
    ).describe(
        "Filter Profiles by these LinkedIn function IDs. Example: `8` for 'Engineering'.",
    ).optional(),
    "excludeCompanyHeadquarterLocations": z.array(z.any()).describe(
        "Exclude Profiles by their current company's headquarter location.",
    ).optional(),
    "startPage": z.number().int().min(1).max(100).describe(
        "The page number to start scraping from.",
    ).optional(),
    "takePages": z.number().int().min(0).max(100).describe(
        "The number of search pages to scrape. Each page contains 25 profiles.",
    ).optional(),
    "autoQuerySegmentation": z.boolean().describe(
        "Enable automatic query segmentation to split broad search queries into smaller segments based on LinkedIn filters. This helps in scraping a larger number of unique profiles without hitting LinkedIn's search limits.",
    ).optional(),
    "autoQuerySegmentationLevels": z.array(
        z.enum(["default", "country", "state", "seniority_level", "industry"]),
    ).describe(
        "Select the segmentation levels to be used for automatic query segmentation.",
    ).optional(),
    "autoQuerySegmentationTargetCountries": z.array(
        z.enum([
            "US",
            "IN",
            "BR",
            "CN",
            "GB",
            "FR",
            "CA",
            "ID",
            "MX",
            "IT",
            "ES",
            "AU",
            "DE",
            "TR",
            "NL",
            "PH",
            "CO",
            "AR",
            "ZA",
            "CL",
            "MY",
            "NG",
            "AE",
            "EG",
            "BE",
            "SE",
            "SA",
            "PL",
            "PT",
            "CH",
            "KR",
            "DK",
            "RO",
            "SG",
            "JP",
            "TW",
            "IE",
            "KE",
            "NZ",
            "IL",
            "NO",
            "AT",
            "FI",
        ]),
    ).describe(
        "Select the target country to focus the automatic query segmentation. This helps in narrowing down the search results to a specific geographic location.",
    ).optional(),
    "profileDeduplicationMode": z.enum([
        "off",
        "insert_ids",
        "insert_profiles",
        "read_only",
    ]).describe(
        "Choose how the actor should handle deduplication of LinkedIn profiles across multiple runs using your MongoDB database.",
    ).optional(),
    "mongoDbConnectionString": z.string().describe(
        "Your MongoDB connection string to the database where the actor will store and check scraped profile IDs for deduplication. Example: `mongodb+srv://:@cluster0.mongodb.net`",
    ).optional(),
    "mongoDbDatabaseName": z.string().describe(
        "The name of the MongoDB database where the actor will store and check scraped profile IDs for deduplication. Default name is: `harvestapi`",
    ).optional(),
    "postFilteringMongoDbQuery": z.record(z.string(), z.any()).describe(
        "A MongoDB query in JSON format to further filter the scraped profiles before saving them to the dataset.",
    ).optional(),
    "postFilteringMongoDbAggregation": z.array(z.record(z.string(), z.any()))
        .describe(
            "A MongoDB aggregation pipeline in JSON format to further filter the scraped profiles before saving them to the dataset.",
        ).optional(),
});
