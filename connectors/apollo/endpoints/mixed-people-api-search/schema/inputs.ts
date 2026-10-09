import { z } from "zod";
import {
    zBound,
    zDate,
    zEmployeeRanges,
    zSearchPage,
    zSearchPerPage,
    zStringList,
} from "../../../schema/common.ts";

/** POST /mixed_people/api_search query params — the vendor mirror
 *  (docs.apollo.io/reference/people-api-search, 2026-09-16). Every filter
 *  is optional; a bare search is legal and free. */
export const zPeopleSearchQueryParams = z.object({
    "person_titles[]": zStringList.describe(
        "Job titles to match (any one matches; similar titles are included " +
            "unless include_similar_titles is false). Example: 'marketing " +
            "manager'.",
    ).optional(),
    include_similar_titles: z.boolean().describe(
        "Whether titles similar to person_titles[] also match. Set false " +
            "for strict title matches.",
    ).optional(),
    q_keywords: z.string().min(1).describe(
        "Free-text words to filter the results by.",
    ).optional(),
    q_person_name: z.string().min(1).describe(
        "Search by name only, independent of the other filters; a person " +
            "matches when their name contains every word given.",
    ).optional(),
    "person_locations[]": zStringList.describe(
        "Where the people live: cities, US states, or countries.",
    ).optional(),
    "person_seniorities[]": z.array(z.enum([
        "owner",
        "founder",
        "c_suite",
        "partner",
        "vp",
        "head",
        "director",
        "manager",
        "senior",
        "entry",
        "intern",
    ])).describe(
        "Seniority of the person's CURRENT title (any one matches).",
    ).optional(),
    "organization_locations[]": zStringList.describe(
        "Headquarters location of the person's current employer: cities, " +
            "US states, or countries.",
    ).optional(),
    "q_organization_domains_list[]": zStringList.max(1000).describe(
        "Employer domains, current or previous (no www. or @); up to 1,000.",
    ).optional(),
    "contact_email_status[]": z.array(z.enum([
        "verified",
        "unverified",
        "likely to engage",
        "unavailable",
    ])).describe("Email statuses to include.").optional(),
    "organization_ids[]": zStringList.describe(
        "Apollo organization ids of the employers to include (from " +
            "Organization Search).",
    ).optional(),
    "organization_num_employees_ranges[]": zEmployeeRanges.describe(
        "Employer headcount ranges as 'lower,upper' strings, e.g. '1,10', " +
            "'250,500'.",
    ).optional(),
    "revenue_range[min]": zBound.describe(
        "Minimum revenue of the current employer, as a bare integer.",
    ).optional(),
    "revenue_range[max]": zBound.describe(
        "Maximum revenue of the current employer, as a bare integer.",
    ).optional(),
    "currently_using_all_of_technology_uids[]": zStringList.describe(
        "Technology uids the current employer must ALL use (underscores for " +
            "spaces and periods, e.g. 'google_analytics').",
    ).optional(),
    "currently_using_any_of_technology_uids[]": zStringList.describe(
        "Technology uids of which the current employer uses at least one.",
    ).optional(),
    "currently_not_using_any_of_technology_uids[]": zStringList.describe(
        "Technology uids that exclude a person when their employer uses any.",
    ).optional(),
    "q_organization_job_titles[]": zStringList.describe(
        "Job titles listed in active job postings at the current employer.",
    ).optional(),
    "organization_job_locations[]": zStringList.describe(
        "Locations of jobs the current employer is actively recruiting for.",
    ).optional(),
    "organization_num_jobs_range[min]": zBound.describe(
        "Minimum number of active job postings at the current employer.",
    ).optional(),
    "organization_num_jobs_range[max]": zBound.describe(
        "Maximum number of active job postings at the current employer.",
    ).optional(),
    "organization_job_posted_at_range[min]": zDate.describe(
        "Earliest job-posting date at the current employer (YYYY-MM-DD).",
    ).optional(),
    "organization_job_posted_at_range[max]": zDate.describe(
        "Latest job-posting date at the current employer (YYYY-MM-DD).",
    ).optional(),
    page: zSearchPage.optional(),
    per_page: zSearchPerPage.optional(),
}).strict();
