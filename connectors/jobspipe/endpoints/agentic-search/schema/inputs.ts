import { z } from "zod";

/**
 * JobsPipe `POST /v1/jobs/agentic-search` request body — the faithful
 * mirror of the published OpenAPI `AgenticSearchRequest`
 * (docs.jobspipe.dev, 2026-10-07): optionality only, no `.default()`
 * (D25 — `limit` is tightened at the binding). `.strict()` mirrors the
 * vendor's `additionalProperties: false` on the top level; `filters` is
 * an open record because the vendor ignores unknown keys inside it.
 */
export const zJobsPipeAgenticSearchBody = z.strictObject({
    query: z.string().min(2).max(500).describe(
        'What the caller is looking for, in plain language, e.g. "senior ' +
            'backend engineer in Berlin, visa sponsorship, hybrid ok".',
    ),
    filters: z.record(z.string(), z.unknown()).describe(
        "Hard filters applied to every planned search, in the filter " +
            "names of /v1/jobs/search (job_country_code_or, city_or, " +
            "region_or, remote, posted_at_max_age_days, language_or, ...). " +
            "Unknown keys are ignored. Paging and ordering keys are not " +
            "accepted.",
    ).optional(),
    limit: z.number().int().min(1).max(25).describe(
        "Postings to return, at most 25 and never more than the plan's " +
            "page size.",
    ).optional(),
});
