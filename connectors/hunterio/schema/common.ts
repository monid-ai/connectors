import { z } from "zod";

/** Shared fragments for the Hunter endpoint schemas — the vendor mirror
 *  (hunter.io/api-documentation/v2, 2026-09-17, cross-checked against
 *  v1). Only what two or more endpoints use lives here. */

/** Domain name identifier (preferred over a company name upstream). */
export const zDomain = z.string().min(1).describe(
    "Domain name, e.g. 'stripe.com'. Preferred over company — it skips " +
        "the name-to-domain conversion.",
);

/** Company name identifier (min 3 chars, upstream requirement). */
export const zCompanyName = z.string().min(3).describe(
    "Company name, e.g. 'Stripe'. When both company and domain are " +
        "given, domain wins.",
);

/** A comma-delimited multi-value filter (Hunter's flat-param encoding —
 *  one string, not a list; the engine's repeated-key form is not what
 *  Hunter reads). */
export const zCommaList = (description: string, values?: string) =>
    z.string().min(1).describe(
        description +
            (values ? ` Possible values: ${values}.` : "") +
            " Several values can be selected, comma-delimited.",
    );

const zContinent = z.enum([
    "Africa",
    "Antarctica",
    "Asia",
    "Europe",
    "North America",
    "Oceania",
    "South America",
]);

const zBusinessRegion = z.enum(["AMER", "EMEA", "APAC", "LATAM"]);

/** One location constraint: a continent, a business region, or a country
 *  (optionally narrowed by state / city). Hunter validates the combination
 *  server-side (`invalid_headquarters_location_*`). */
export const zLocationEntry = z.object({
    continent: zContinent.describe("A continent name.").optional(),
    business_region: zBusinessRegion.describe(
        "A business region: AMER, EMEA, APAC, or LATAM.",
    ).optional(),
    country: z.string().length(2).describe(
        "ISO 3166-1 alpha-2 country code, e.g. 'US'.",
    ).optional(),
    state: z.string().describe(
        "US state code — only valid when country is 'US'.",
    ).optional(),
    city: z.string().describe("City name.").optional(),
}).describe(
    "A location: continent, business_region, or country (+ state/city).",
);

/** include / exclude lists of location constraints (domain-search and
 *  the discover family). */
export const zLocationFilter = z.object({
    include: z.array(zLocationEntry).describe("Locations to include.")
        .optional(),
    exclude: z.array(zLocationEntry).describe("Locations to exclude.")
        .optional(),
});

export const zHeadcount = z.enum([
    "1-10",
    "11-50",
    "51-200",
    "201-500",
    "501-1000",
    "1001-5000",
    "5001-10000",
    "10001+",
]);

const zCompanyType = z.enum([
    "educational",
    "educational institution",
    "government agency",
    "non profit",
    "partnership",
    "privately held",
    "public company",
    "self employed",
    "self owned",
    "sole proprietorship",
]);

const zIncludeExclude = z.object({
    include: z.array(z.string().min(1)).describe("Values to include.")
        .optional(),
    exclude: z.array(z.string().min(1)).describe("Values to exclude.")
        .optional(),
});

const zMatchMode = z.enum(["any", "all"]).describe(
    "Match on any or all of the listed values. Default 'all'.",
).optional();

/** The Discover filter set — shared verbatim by `/discover` and
 *  `/discover/people` (upstream documents them as identical). */
export const discoverFilterFields = {
    organization: z.object({
        domain: z.array(z.string().min(1)).describe("Company domains.")
            .optional(),
        name: z.array(z.string().min(1)).describe("Company names.")
            .optional(),
    }).describe("Select specific companies by domain or name.").optional(),
    similar_to: z.object({
        domain: z.string().min(1).describe("A company domain.").optional(),
        name: z.string().min(1).describe("A company name.").optional(),
    }).describe(
        "Find companies similar to one domain or name (domain wins).",
    ).optional(),
    headquarters_location: zLocationFilter.describe(
        "Headquarters locations to include and/or exclude.",
    ).optional(),
    industry: zIncludeExclude.describe(
        "Industries to include/exclude. Valid values: " +
            "https://hunter.io/files/industries.json",
    ).optional(),
    headcount: z.array(zHeadcount).describe(
        "Company size ranges to include.",
    ).optional(),
    company_type: z.object({
        include: z.array(zCompanyType).describe("Company types to include.")
            .optional(),
        exclude: z.array(zCompanyType).describe("Company types to exclude.")
            .optional(),
    }).describe("Company types to include/exclude.").optional(),
    year_founded: z.object({
        from: z.number().int().describe("Earliest founding year.")
            .optional(),
        to: z.number().int().describe("Latest founding year.").optional(),
        include: z.array(z.number().int()).describe("Years to include.")
            .optional(),
        exclude: z.array(z.number().int()).describe("Years to exclude.")
            .optional(),
    }).describe(
        "Founding years: a from/to range, or explicit years to " +
            "include/exclude (not both).",
    ).optional(),
    keywords: z.object({
        include: z.array(z.string().min(1)).describe("Keywords to include.")
            .optional(),
        exclude: z.array(z.string().min(1)).describe("Keywords to exclude.")
            .optional(),
        match: zMatchMode,
    }).describe("Keywords to include/exclude.").optional(),
    technology: z.object({
        include: z.array(z.string().min(1)).describe(
            "Technologies to include.",
        ).optional(),
        exclude: z.array(z.string().min(1)).describe(
            "Technologies to exclude.",
        ).optional(),
        match: zMatchMode,
    }).describe(
        "Technologies in use. Valid values: " +
            "https://hunter.io/files/technologies.json",
    ).optional(),
    funding: z.object({
        series: z.array(z.enum([
            "pre_seed",
            "seed",
            "pre_series_a",
            "series_a",
            "pre_series_b",
            "series_b",
            "pre_series_c",
            "series_c+",
            "other",
        ])).describe("Funding series to include.").optional(),
        amount: z.object({
            from: z.number().min(0).describe("Minimum amount raised.")
                .optional(),
            to: z.number().min(0).describe("Maximum amount raised.").optional(),
        }).describe("Total funding amount range.").optional(),
        date: z.object({
            from: z.string().describe("YYYY-MM-DD").optional(),
            to: z.string().describe("YYYY-MM-DD").optional(),
        }).describe("Last funding date range.").optional(),
    }).describe("Funding series, amount, and date filters.").optional(),
} as const;

/** Discover pagination (max offset 10,000 upstream). */
export const discoverPaginationFields = {
    limit: z.number().int().min(1).max(100).describe(
        "Companies per page. Default and max 100.",
    ).optional(),
    offset: z.number().int().min(0).max(10_000).describe(
        "Companies to skip. Max 10,000.",
    ).optional(),
} as const;
