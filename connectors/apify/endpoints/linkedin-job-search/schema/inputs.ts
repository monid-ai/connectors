import { z } from "zod";

/**
 * harvestapi/linkedin-job-search — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/harvestapi~linkedin-job-search/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zLinkedinJobSearchBody = z.object({
    "jobTitles": z.array(z.any()).describe(
        "Queries to provide to LinkedIn job search. [It supports boolean operators](https://www.linkedin.com/help/linkedin/answer/a524335). We will run the scraper once for each query. All filters below will be applied to each query.",
    ).optional(),
    "locations": z.array(z.any()).describe(
        'Filter by these LinkedIn locations. Example: `San Francisco`. LinkedIn does not always understand your text queries. For example for "UK" query it will apply "Ukraine" location, so you should use "United Kingdom" in this case. Try this out first in the location filter input of LinkedIn search at ...',
    ).optional(),
    "maxItems": z.number().int().describe(
        "Maximum number of jobs to scrape per each job title and location input.",
    ).optional(),
    "company": z.array(z.any()).describe(
        "Filter by these companies. Provide full URLs or company names to search in LinkedIn",
    ).optional(),
    "workplaceType": z.array(z.enum(["remote", "hybrid", "office"])).describe(
        "Select one or more applicable workplace types.",
    ).optional(),
    "employmentType": z.array(
        z.enum([
            "full-time",
            "part-time",
            "contract",
            "internship",
            "temporary",
        ]),
    ).describe("Select one or more applicable employment types.").optional(),
    "experienceLevel": z.array(
        z.enum([
            "internship",
            "entry",
            "associate",
            "mid-senior",
            "director",
            "executive",
        ]),
    ).describe("Select one or more applicable experience levels.").optional(),
    "salary": z.array(
        z.enum([
            "40k+",
            "60k+",
            "80k+",
            "100k+",
            "120k+",
            "140k+",
            "160k+",
            "180k+",
            "200k+",
        ]),
    ).describe("Filter by these salary ranges. Example: `100k+`").optional(),
    "under10Applicants": z.boolean().describe(
        "Filter jobs with under 10 applicants.",
    ).optional(),
    "easyApply": z.boolean().describe(
        "Filter jobs with LinkedIn easy apply option.",
    ).optional(),
    "postedLimit": z.enum(["1h", "24h", "week", "month"]).describe(
        "Filter jobs posted in the last hour, 24 hours, week or month.",
    ).optional(),
    "industryIds": z.array(z.any()).describe(
        "Filter Profiles by these LinkedIn industry IDs. Example: `4` for 'Software Development'. Full list: `https://github.com/HarvestAPI/linkedin-industry-codes-v2/blob/main/linkedin_industry_code_v2_all_eng_with_header.csv`",
    ).optional(),
    "sortBy": z.enum(["date", "relevance"]).describe(
        "Sort the results by date or relevance.",
    ).optional(),
    "geoIds": z.array(z.any()).describe(
        "Filter Jobs by these LinkedIn geo IDs. Example: `103644278`.",
    ).optional(),
    "page": z.number().int().describe(
        "Page number to start scraping from. Each page contains 25 jobs.",
    ).optional(),
    "cookie": z.string().describe(
        "Your LinkedIn cookies. You can export them via the browser extension [Cookie-Editor](https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm/).",
    ).optional(),
    "userAgent": z.string().describe(
        "User agent to use for scraping. Copy your User Agent from https://www.whatismybrowser.com/detect/what-is-my-user-agent/ and paste it here.",
    ).optional(),
    "proxy": z.string().describe(
        "Proxy URL to use for scraping. If not provided, the actor will use its default proxy. For safe scraping, we recommend you to find and provide a clean residential proxy.",
    ).optional(),
});
