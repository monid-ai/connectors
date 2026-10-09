import { z } from "zod";
import {
    zBound,
    zDate,
    zEmployeeRanges,
    zSearchPage,
    zSearchPerPage,
    zStringList,
} from "../../../schema/common.ts";

/** POST /mixed_companies/search query params — the vendor mirror
 *  (docs.apollo.io/reference/organization-search, 2026-09-16). Every
 *  filter is optional. */
export const zOrganizationSearchQueryParams = z.object({
    "q_organization_domains_list[]": zStringList.max(1000).describe(
        "Company domains (no www. or @); up to 1,000.",
    ).optional(),
    "organization_num_employees_ranges[]": zEmployeeRanges.describe(
        "Headcount ranges as 'lower,upper' strings, e.g. '1,10', '250,500'.",
    ).optional(),
    "organization_locations[]": zStringList.describe(
        "Headquarters locations to include: cities, US states, or countries.",
    ).optional(),
    "organization_not_locations[]": zStringList.describe(
        "Headquarters locations to exclude.",
    ).optional(),
    "revenue_range[min]": zBound.describe(
        "Minimum revenue, as a bare integer.",
    ).optional(),
    "revenue_range[max]": zBound.describe(
        "Maximum revenue, as a bare integer.",
    ).optional(),
    "currently_using_any_of_technology_uids[]": zStringList.describe(
        "Technology uids of which the company uses at least one " +
            "(underscores for spaces and periods, e.g. 'google_analytics').",
    ).optional(),
    "q_organization_keyword_tags[]": zStringList.describe(
        "Keywords associated with the company, e.g. 'mining', 'consulting'.",
    ).optional(),
    q_organization_name: z.string().min(1).describe(
        "Company name to match; partial matches are accepted.",
    ).optional(),
    "organization_ids[]": zStringList.describe(
        "Apollo organization ids to include.",
    ).optional(),
    "latest_funding_amount_range[min]": zBound.describe(
        "Minimum amount of the most recent funding round, as a bare integer.",
    ).optional(),
    "latest_funding_amount_range[max]": zBound.describe(
        "Maximum amount of the most recent funding round, as a bare integer.",
    ).optional(),
    "total_funding_range[min]": zBound.describe(
        "Minimum total funding across all rounds, as a bare integer.",
    ).optional(),
    "total_funding_range[max]": zBound.describe(
        "Maximum total funding across all rounds, as a bare integer.",
    ).optional(),
    "latest_funding_date_range[min]": zDate.describe(
        "Earliest date of the most recent funding round (YYYY-MM-DD).",
    ).optional(),
    "latest_funding_date_range[max]": zDate.describe(
        "Latest date of the most recent funding round (YYYY-MM-DD).",
    ).optional(),
    "q_organization_job_titles[]": zStringList.describe(
        "Job titles listed in the company's active job postings.",
    ).optional(),
    "organization_job_locations[]": zStringList.describe(
        "Locations of jobs the company is actively recruiting for.",
    ).optional(),
    "organization_num_jobs_range[min]": zBound.describe(
        "Minimum number of active job postings.",
    ).optional(),
    "organization_num_jobs_range[max]": zBound.describe(
        "Maximum number of active job postings.",
    ).optional(),
    "organization_job_posted_at_range[min]": zDate.describe(
        "Earliest job-posting date (YYYY-MM-DD).",
    ).optional(),
    "organization_job_posted_at_range[max]": zDate.describe(
        "Latest job-posting date (YYYY-MM-DD).",
    ).optional(),
    page: zSearchPage.optional(),
    per_page: zSearchPerPage.optional(),
}).strict();
