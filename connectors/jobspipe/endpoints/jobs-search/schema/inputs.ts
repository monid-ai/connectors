import { z } from "zod";

/**
 * JobsPipe `POST /v1/jobs/search` request body — the faithful mirror of the
 * published OpenAPI `JobSearchRequest` (docs.jobspipe.dev, 2026-10-07):
 * optionality only, no `.default()` (D25 — `limit` is tightened at the
 * binding in endpoint.ts). `.strict()` mirrors the vendor: JobsPipe rejects
 * an unknown parameter with HTTP 400 ("unknown filter ... Did you mean"),
 * so the gate is ours before it is theirs.
 *
 * Not carried: `blur_company_data`. The spec marks it DEPRECATED and
 * ignored (preview mode was removed; every search bills one credit per
 * job returned), so exposing it would only invite a no-op.
 */
export const zJobsPipeJobSearchBody = z.strictObject({
    job_title_or: z.array(z.string()).describe(
        "Match jobs whose title contains any of these.",
    ).optional(),
    job_title_not: z.array(z.string()).describe(
        "Exclude jobs whose title contains any of these.",
    ).optional(),
    description_or: z.array(z.string()).describe(
        "Match jobs whose description contains every word of any one of these phrases. Each phrase is split into words and matched case-insensitively; the words may appear in any order and need not be adjacent, so this is neither a substring nor an exact-phrase match.",
    ).optional(),
    description_not: z.array(z.string()).describe(
        "Exclude jobs whose description contains every word of any one of these phrases, matched the same way as description_or: case-insensitive, in any order, not necessarily adjacent.",
    ).optional(),
    job_country_code_or: z.array(z.string()).describe(
        "Match any of these ISO alpha-2 country codes, e.g. US, GB.",
    ).optional(),
    job_country_code_not: z.array(z.string()).describe(
        "Exclude these ISO alpha-2 country codes.",
    ).optional(),
    job_location_or: z.array(z.string()).describe(
        "Match jobs whose city or region contains any of these, e.g. Seattle, WA. Metro wrappers are stripped (Greater London also matches London) and a US state, Canadian province or UK nation by name matches every spelling of it (Pennsylvania also matches PA). Terms of three characters or fewer are codes or exact names and match whole values (WA is Washington state, never Iowa); a country code or name matches the whole country. Combine with job_country_code_or to disambiguate same-named cities. For a city by name, city_or is the precise filter.",
    ).optional(),
    city_or: z.array(z.string()).describe(
        "Whole city names, e.g. London, Munich. Case-insensitive, and a metro wrapper on the stored value is ignored (Greater London and London Area are London). Spellings and diacritics are normalised for cities we know: München finds Munich, Cracow finds Kraków. Other cities match the stored value exactly. Combine with job_country_code_or to disambiguate same-named cities; use job_location_or for substring matching.",
    ).optional(),
    job_seniority_or: z.array(z.string()).describe(
        "Match any of these seniority levels.",
    ).optional(),
    include_unlabeled_employment_type: z.boolean().describe(
        "Also return jobs whose employment type is unknown. About 27% of postings do not state one, and employment_type_or excludes every one of them by default.",
    ).optional(),
    include_unlabeled_seniority: z.boolean().describe(
        "Also return jobs whose seniority is unknown. About 55% of postings do not state a level, and job_seniority_or excludes every one of them by default.",
    ).optional(),
    skills_or: z.array(z.string()).describe(
        "Match jobs tagged with any of these skill slugs, e.g. python, kubernetes. Skills are extracted from title + description against a curated lexicon.",
    ).optional(),
    occupation_code_or: z.array(z.string()).describe(
        "ISCO-08 occupation codes. 4-digit codes match exactly (2512 = Software Developers); 1-3 digit codes match as hierarchy prefixes (25 = all ICT professionals).",
    ).optional(),
    isic_division_or: z.array(z.string()).describe(
        "ISIC Rev.4 industry divisions of the employer (2-digit, e.g. 62 = Computer programming and consultancy).",
    ).optional(),
    region_or: z.array(z.string()).describe(
        'US states and Canadian provinces as ISO 3166-2 codes, e.g. ["US-NY", "CA-ON"]. Qualified by country because the underlying column stores "CA" for California while "CA" is also Canada\'s country code. Matches every spelling a job board publishes, so "CA-ON" finds both "ON" and "Ontario".',
    ).optional(),
    employment_type_or: z.array(
        z.enum([
            "full-time",
            "part-time",
            "contract",
            "temporary",
            "internship",
        ]),
    ).describe("Match any of these employment types.").optional(),
    language_or: z.array(z.string()).describe(
        'Match postings WRITTEN in any of these languages, as lowercase ISO 639-1 codes, e.g. ["en"] or ["en", "sv"]. The language of the posting text, not of the country it sits in: 18.3% of Swedish postings and 17.7% of German ones are in English, and Canada is 84.5% English with the rest French. Use it to fetch only the roles a team can actually read when hiring across a multilingual market. Values that are not exactly two letters are ignored. Postings we have not labelled never match; add include_unknown: ["language"] to keep them.',
    ).optional(),
    language_not: z.array(z.string()).describe(
        'Exclude postings written in any of these languages, as lowercase ISO 639-1 codes, e.g. ["fr"]. Postings we have not labelled are kept, so this narrows by known language rather than requiring one.',
    ).optional(),
    source_or: z.array(z.string()).describe(
        'Return only jobs from any of these collector sources (OR). Job boards: linkedin, indeed, cvlibrary, resumelibrary, ycombinator, arbeitnow, himalayas, jobicy, themuse, remoteok, workingnomads, landingjobs, remotive, rise, bayt. Public employment services: eures, jobtech. ATS (company career sites): greenhouse, workday, ashby, lever, workable, recruitee, personio, smartrecruiters, breezy, paylocity, manatal, jobscore, teamtailor, pinpoint, hirehive. Case, spaces and punctuation are ignored ("CV-Library" = cvlibrary); aliases: yc for ycombinator, breezyhr for breezy. To exclude sources instead, use source_not. An unrecognized source is not an error; it simply matches nothing, so the request returns zero jobs.',
    ).optional(),
    source_not: z.array(z.string()).describe(
        "Exclude jobs from these collector sources. Same accepted values and aliases as source_or, plus any source added later; an unrecognized source excludes nothing.",
    ).optional(),
    company_name_partial_match_or: z.array(z.string()).describe(
        "Match any of these company names (partial / contains).",
    ).optional(),
    company_technology_slug_or: z.array(z.string()).max(10).describe(
        'Beta. Only jobs at companies whose own postings show they use any of these technologies (evidence tier likely or confirmed), e.g. ["snowflake", "dbt"]. At most 10 slugs. Answers 400 "filter not enabled" until the filter is switched on.',
    ).optional(),
    min_employee_count: z.number().int().describe(
        "Only jobs at companies with at least this many employees. Uses the exact headcount where known, otherwise the lower bound of the company's size band. Jobs whose company size is unknown are excluded.",
    ).optional(),
    max_employee_count: z.number().int().describe(
        'Only jobs at companies with at most this many employees. Uses the exact headcount where known; a company known only by a size band matches when the band starts at or below this number ("11-50" matches 100, "10,000+" does not).',
    ).optional(),
    min_revenue_usd: z.number().min(0).describe(
        'Only jobs at companies whose estimated annual revenue, in US dollars, is at least this amount (the published revenue_usd). Companies with no revenue on record are excluded unless include_unknown contains "company_revenue".',
    ).optional(),
    max_revenue_usd: z.number().min(0).describe(
        'Only jobs at companies whose estimated annual revenue, in US dollars, is at most this amount (the published revenue_usd). Companies with no revenue on record are excluded unless include_unknown contains "company_revenue".',
    ).optional(),
    lei_or: z.array(z.string().regex(/^[0-9A-Za-z]{20}$/)).min(1).max(50)
        .describe(
            'Legal Entity Identifiers (ISO 17442). Matches jobs at a company with one of these LEIs or at any company in the corporate group the LEI heads. 1 to 50 LEIs of 20 letters and digits, e.g. ["5493001KJTIIGC8Y1R12"]; case is ignored, and a comma-separated string is accepted. Jobs at companies without a known LEI never match.',
        ).optional(),
    remote: z.boolean().describe(
        "true for remote-only, false to exclude remote.",
    ).optional(),
    work_arrangement_or: z.array(z.enum(["remote", "hybrid", "onsite"]))
        .describe(
            "Match any of these work arrangements. Finer than remote, which answers false for hybrid and onsite alike. Jobs whose arrangement is unknown never match.",
        ).optional(),
    visa_sponsorship_or: z.array(
        z.enum(["offers", "no", "citizenship_required"]),
    ).describe(
        'Match any of these visa stances, parsed from the posting text: "offers" (sponsorship available), "no" (explicitly not available), "citizenship_required" (citizenship or security clearance required). Jobs that say nothing never match.',
    ).optional(),
    benefits_or: z.array(z.string()).describe(
        'Match jobs advertising any of these benefit slugs, e.g. ["401k", "health_insurance", "paid_time_off"] (any spelling: "health insurance" works too). Benefits come from structured board data (Indeed today), so coverage is partial; see metadata.field_coverage.',
    ).optional(),
    metro_code_or: z.array(z.string()).describe(
        'Match any of these US CBSA metro codes (e.g. "35620" New York). Resolved from the job\'s city/region; non-US jobs never match.',
    ).optional(),
    max_applicant_count: z.number().int().min(0).describe(
        "Only jobs with at most this many applicants. Applicant counts exist only where the source exposes them (LinkedIn), so this filter also drops every job without a count.",
    ).optional(),
    has_recruiter_email: z.boolean().describe(
        "true for only jobs with a recruiter contact email parsed from the posting, false for only jobs without one.",
    ).optional(),
    min_salary_usd: z.number().int().min(0).describe(
        "Only jobs whose posted salary reaches this annual USD amount (the max of the posted range, annualized). Jobs without a posted salary never match; estimated salaries are not consulted.",
    ).optional(),
    max_ghost_score: z.number().int().min(0).max(100).describe(
        "Exclude jobs whose ghost-likelihood score (0-100) exceeds this. Unscored jobs always pass: the filter drops known-likely ghost jobs, it does not require a score.",
    ).optional(),
    include_unknown: z.array(
        z.enum([
            "employment_type",
            "seniority",
            "work_arrangement",
            "location",
            "occupation",
            "industry",
            "visa_sponsorship",
            "benefits",
            "company_size",
            "company_revenue",
            "salary",
            "language",
        ]),
    ).describe(
        'Also match jobs whose value is UNKNOWN for these fields, e.g. ["seniority", "location"]. Without it every filter drops unknowns. "location" widens region_or within each subdivision\'s country, and job_location_or only when job_country_code_or is set. include_unknown_size, include_unlabeled_seniority and include_unlabeled_employment_type are aliases.',
    ).optional(),
    last_verified_max_age_days: z.number().int().min(1).describe(
        "Only jobs seen on their source (or re-written) within this many days. Drops active jobs we have not confirmed recently.",
    ).optional(),
    esco_skill_id_or: z.array(z.string()).describe(
        "Match jobs tagged with any of these ESCO skill concept IDs (exact match). See each job's esco_skills for the id/label pairs.",
    ).optional(),
    posted_at_max_age_days: z.number().int().describe(
        "Only postings newer than this many days.",
    ).optional(),
    posted_at_gte: z.string().describe(
        "Only postings on or after this date (YYYY-MM-DD).",
    ).optional(),
    posted_at_lte: z.string().describe(
        "Only postings on or before this date (YYYY-MM-DD).",
    ).optional(),
    discovered_at_gte: z.string().describe(
        "Only postings first discovered by JobsPipe at or after this UTC datetime (YYYY-MM-DD HH:MM:SS). Tracks when we first saw the posting, not when it was posted; poll with your last run time to get only new jobs.",
    ).optional(),
    limit: z.number().int().min(1).describe(
        "Maximum number of results to return. Defaults to 25 and is capped by your plan's page size: 25 on Free, 100 below 300,000 credits a month, 500 from 300,000. One credit buys one job for the rest of the calendar month, so this value is the most the call can cost: a response carrying 25 postings the account has not had this month costs 25 credits, and postings it already paid for are free. A search that matches nothing costs nothing. metadata.credits_charged reports the actual cost.",
    ).optional(),
    offset: z.number().int().min(0).describe(
        "Number of results to skip. Ignored when cursor is set. A positive offset takes precedence over page.",
    ).optional(),
    page: z.number().int().min(0).describe(
        "Zero-based page index: skips page × limit results. Ignored when cursor is set or offset is positive.",
    ).optional(),
    cursor: z.string().nullable().describe(
        "Opaque pagination cursor. Pass metadata.next_cursor from the previous response to fetch the next page. Takes precedence over offset and page. null is treated as not set, and a cursor that cannot be decoded is ignored, so the first page is served.",
    ).optional(),
    order_by: z.array(
        z.object({ field: z.string(), desc: z.boolean().optional() }),
    ).max(1).describe(
        'Sort order. Results are always newest-first by posted date, and that is the only order accepted: [{"field":"posted_at","desc":true}]. date_posted is accepted as a synonym for posted_at, the field name is case-insensitive, and desc may be omitted. Any other field, "desc": false, or more than one sort key returns 400 rather than being silently ignored.',
    ).optional(),
    status: z.enum(["active", "closed", "any"]).describe(
        'Lifecycle filter: active (still open), closed, or any. Defaults to active, and the default also applies to job_id_or and job_ids, so looking up a closed job by ID requires status "closed" or "any".',
    ).optional(), /* vendor default "active" */
    company_name_or: z.array(z.string()).describe(
        "Match any of these company names. Each name and the stored company name are normalized the same way: lowercased, punctuation replaced by spaces, whitespace collapsed, and one trailing legal suffix (such as Inc, LLC, Ltd, Corp, GmbH, PLC, Group or Holdings) dropped. A job matches when its normalized company name equals a normalized name or starts with it followed by a space, so Amazon matches Amazon Web Services but not Amazonia.",
    ).optional(),
    job_id_or: z.array(z.string()).describe(
        "Return jobs whose ID is any of these. Each value is matched against both the JobsPipe id and the source's native id. Behaves the same as job_ids; values from both are combined. The status filter still applies and defaults to active.",
    ).optional(),
    job_ids: z.array(z.string()).describe(
        "Look up these job IDs. Behaves the same as job_id_or: matched against the id or native id, combined with job_id_or, and subject to the status filter, which defaults to active.",
    ).optional(),
    include_unknown_size: z.boolean().describe(
        'Also return jobs at companies whose employee count is unknown when min_employee_count or max_employee_count is set; those filters otherwise exclude every unknown-size company. Alias of include_unknown: ["company_size"].',
    ).optional(),
    employer_type_or: z.array(z.enum(["employer", "agency", "broker"]))
        .describe(
            'Match only these employer types. "employer" hires for itself, "agency" is a staffing or recruitment firm posting for a client, "broker" is a job board republishing another company\'s listing. Including "employer" also returns jobs whose company has not been classified yet, which are served with employer_type "employer".',
        ).optional(),
    employer_type_not: z.array(z.enum(["employer", "agency", "broker"]))
        .describe(
            'Exclude these employer types. Only classified jobs are excluded: a job whose company has not been classified yet is served as "employer" but is never removed by this filter, so ["employer"] does not drop it and ["agency","broker"] keeps it.',
        ).optional(),
    include_total_results: z.boolean().describe(
        "Include the total match count in metadata.total_results.",
    ).optional(),
    include_technologies: z.boolean().describe(
        "Add technologies, the graded list of technologies each posting names, to every job. Off by default, and the field is then absent. Each returned job that names at least one technology costs 1 extra credit on top of the job's own credit, once per job per calendar month (UTC); jobs with none cost nothing extra. metadata.technologies_credits_charged reports that part of the cost.",
    ).optional(),
});
