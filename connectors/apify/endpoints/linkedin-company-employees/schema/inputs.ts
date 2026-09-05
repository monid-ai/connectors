import { z } from "zod";

/**
 * harvestapi/linkedin-company-employees — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/harvestapi~linkedin-company-employees/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zLinkedinCompanyEmployeesBody = z.object({
    "profileScraperMode": z.enum([
        "Short ($4 per 1k)",
        "Full ($8 per 1k)",
        "Full + email search ($12 per 1k)",
    ]).describe(
        "Choose the mode for scraping LinkedIn profiles. The Short mode provides basic information, while the Full mode includes full detailed profile data.",
    ).optional(),
    "maxItems": z.number().int().describe(
        "Maximum number of profiles to scrape. The actor will stop scraping when this limit is reached.",
    ).optional(),
    "companies": z.array(z.any()).describe(
        "Search employees of these companies. Provide full LinkedIn URLs. Example: `https://www.linkedin.com/company/google`",
    ).optional(),
    "locations": z.array(z.any()).describe(
        'Filter employees by these LinkedIn locations. Example: `San Francisco`. LinkedIn does not always understand your text queries. For example for "UK" query it will apply "Ukraine" location, so you should use "United Kingdom" in this case. Try this out first in the location filter input of LinkedIn ...',
    ).optional(),
    "searchQuery": z.string().describe("Query to search LinkedIn profiles.")
        .optional(),
    "jobTitles": z.array(z.any()).describe(
        "Filter Profiles by these LinkedIn job titles. Example: `Software Engineer`.",
    ).optional(),
    "pastJobTitles": z.array(z.any()).describe(
        "Filter Profiles by these LinkedIn past job titles. Example: `Software Engineer`.",
    ).optional(),
    "schools": z.array(z.any()).describe(
        "Filter Profiles by these LinkedIn schools. Example: `Stanford University`.",
    ).optional(),
    "industryIds": z.array(z.any()).describe(
        "Filter Profiles by these LinkedIn industry IDs. Example: `4` for 'Software Development'. Full list: `https://github.com/HarvestAPI/linkedin-industry-codes-v2/blob/main/linkedin_industry_code_v2_all_eng_with_header.csv`",
    ).optional(),
    "yearsAtCurrentCompanyIds": z.array(z.enum(["1", "2", "3", "4", "5"]))
        .describe(
            'Filter Profiles by these LinkedIn years at current company IDs. Example: `3` for \'3 to 5 years\'. Full list: { "1": "Less than 1 year", "2": "1 to 2 years", "3": "3 to 5 years", "4": "6 to 10 years", "5": "More than 10 years" }',
        ).optional(),
    "yearsOfExperienceIds": z.array(z.enum(["1", "2", "3", "4", "5"])).describe(
        'Filter Profiles by these LinkedIn years of experience IDs. Example: `3` for \'3 to 5 years\'. Full list: { "1": "Less than 1 year", "2": "1 to 2 years", "3": "3 to 5 years", "4": "6 to 10 years", "5": "More than 10 years" }',
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
        'Filter Profiles by these LinkedIn seniority level IDs. Example: `120` for \'Senior\'. Full list: { "100": "In Training", "110": "Entry Level", "120": "Senior", "130": "Strategic", "200": "Entry Level Manager", "210": "Experienced Manager", "220": "Director", "300": "Vice President", "310": "CXO", "...',
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
        'Filter Profiles by these LinkedIn function IDs. Example: `8` for \'Engineering\'. Full list: { "1": "Accounting", "2": "Administrative", "3": "Arts and Design", "4": "Business Development", "5": "Community and Social Services", "6": "Consulting", "7": "Education", "8": "Engineering", "9": "Entrepre...',
    ).optional(),
    "companyHeadcount": z.array(
        z.enum(["A", "B", "C", "D", "E", "F", "G", "H", "I"]),
    ).describe("Filter Profiles by their current company's headcount.")
        .optional(),
    "recentlyChangedJobs": z.boolean().describe(
        "If enabled, only Profiles of people who have recently changed jobs will be returned.",
    ).optional(),
    "companyBatchMode": z.enum(["all_at_once", "one_by_one"]).describe(
        "Choose how to process the companies. 'All at once' will search employees from all companies in one query, while 'One by one' will process each make a query for each company separately. The start fee will apply for each query.",
    ).optional(),
    "maxItemsPerCompany": z.number().int().describe(
        "Maximum number of profiles to scrape. The actor will stop scraping when this limit is reached.",
    ).optional(),
    "startPage": z.number().int().min(0).max(100).describe(
        "The page number to start scraping from. Starts from 1.",
    ).optional(),
    "takePages": z.number().int().min(0).max(100).describe(
        "The number of search pages to scrape. Each page contains 25 profiles.",
    ).optional(),
    "excludeLocations": z.array(z.any()).describe(
        'Exclude Profiles by these LinkedIn locations. Example: `San Francisco`. LinkedIn does not always understand your text queries. For example for "UK" query it will apply "Ukraine" location, so you should use "United Kingdom" in this case. Try this out first in the location filter input of LinkedIn ...',
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
});
