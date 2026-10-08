import { z } from "zod";

/** Shared fragments from the official CompanyEnrich OpenAPI references,
 * checked 2026-10-07. Optionality and nullability are vendor facts; defaults
 * and result-cap requirements belong at endpoint bindings. */

export const zCompanyCategory = z.enum([
    "b2b",
    "b2c",
    "b2g",
    "e-commerce",
    "media",
    "service-provider",
    "mobile",
    "saas",
]);

export const zCompanyEmployees = z.enum([
    "1-10",
    "11-50",
    "51-200",
    "201-500",
    "501-1K",
    "1K-5K",
    "5K-10K",
    "over-10K",
]);

export const zCompanyType = z.enum([
    "private",
    "public",
    "self-employed",
    "self-owned",
    "partnership",
    "nonprofit",
    "educational",
    "government",
]);

export const zCompanyRevenue = z.enum([
    "under-1m",
    "1m-10m",
    "10m-50m",
    "50m-100m",
    "100m-200m",
    "200m-1b",
    "over-1b",
]);

export const zCompanyFundingRound = z.enum([
    "seed",
    "debt_financing",
    "angel",
    "venture",
    "series_a",
    "series_b",
    "series_c",
    "series_d",
    "series_e",
    "series_f",
    "series_g",
    "series_h",
    "other",
]);

/** Identical company filters shared by search, lookalikes and exclusions. */
export const zCompanyFilterFields = {
    regions: z.array(z.string()).nullable().describe(
        "The region IDs to filter by",
    ).optional(),
    countries: z.array(z.string()).nullable().describe(
        "The 2 letter country codes to filter by",
    ).optional(),
    states: z.array(z.number().int()).nullable().describe(
        "The state IDs to filter by",
    ).optional(),
    cities: z.array(z.number().int()).nullable().describe(
        "The city IDs to filter by",
    ).optional(),
    type: z.array(zCompanyType).nullable().describe(
        "The list of company types to filter by",
    ).optional(),
    category: z.array(zCompanyCategory).nullable().describe(
        "The list of company categories to filter by",
    ).optional(),
    employees: z.array(zCompanyEmployees).nullable().describe(
        "The list of employee counts to filter by",
    ).optional(),
    reportedEmployees: z.array(zCompanyEmployees).nullable().describe(
        "The list of externally reported employee counts to filter by",
    ).optional(),
    revenue: z.array(zCompanyRevenue).nullable().describe(
        "The list of revenue ranges to filter by",
    ).optional(),
    naicsCode: z.array(z.number().int()).nullable().describe(
        "The NAICS codes to filter by. Can be 2 to 6 digit codes. In case of a 2-5 digit code, all 6 digit codes under it will be included",
    ).optional(),
    keywords: z.array(z.string()).nullable().describe(
        "The keywords to filter by",
    ).optional(),
    technologies: z.array(z.string()).nullable().describe(
        "The technologies to filter by",
    ).optional(),
    fundingRounds: z.array(zCompanyFundingRound).nullable().describe(
        "The funding rounds to filter by",
    ).optional(),
};

export const zCompanyExcludeFilters = z.object({
    domains: z.array(z.string()).nullable().describe(
        "The domain names of companies to exclude from the results",
    ).optional(),
    ...zCompanyFilterFields,
}).nullable().describe(
    "Exclusion filters to apply on the companies. If a company matches any of the filters here, it will be excluded from the results.",
);

export const zCompanyFundingAmountRange = z.object({
    min: z.number().nullable().describe(
        "The minimum funding amount (inclusive)",
    ).optional(),
    max: z.number().nullable().describe(
        "The maximum funding amount (inclusive)",
    ).optional(),
}).nullable().describe("The funding amount range to filter by");

export const zNullableOfCompanyWorkforceGrowthPeriod = z.enum([
    "m6",
    "y1",
    "y2",
]).nullable().describe("The period to measure workforce growth over.");

export const zNullableOfCompanyWorkforceGrowthDepartment = z.enum([
    "overall",
    "c_suite",
    "product_management",
    "engineering_technical",
    "design",
    "education",
    "finance",
    "human_resources",
    "information_technology",
    "legal",
    "marketing",
    "medical_health",
    "operations",
    "sales",
    "consulting",
]).nullable().describe("The department to measure workforce growth for.");

export const zCompanyWorkforceGrowthInput = z.object({
    period: zNullableOfCompanyWorkforceGrowthPeriod.optional(),
    department: zNullableOfCompanyWorkforceGrowthDepartment.optional(),
    minPercent: z.number().nullable().describe(
        "The minimum workforce growth percentage (inclusive). Example: 15 means 15% growth, -10 means 10% decline.",
    ).optional(),
    maxPercent: z.number().nullable().describe(
        "The maximum workforce growth percentage (inclusive). Example: 15 means 15% growth, -10 means 10% decline.",
    ).optional(),
}).nullable().describe(
    "Filter companies by workforce growth percentage over a selected period and department.",
);

export const zNullableOfCompanyWorkforceGrowthDepartment2 = z.enum([
    "overall",
    "c_suite",
    "product_management",
    "engineering_technical",
    "design",
    "education",
    "finance",
    "human_resources",
    "information_technology",
    "legal",
    "marketing",
    "medical_health",
    "operations",
    "sales",
    "consulting",
]).nullable().describe(
    "The department to filter headcount for. Defaults to overall if not specified.",
);

export const zCompanyWorkforceSizeInput = z.object({
    department: zNullableOfCompanyWorkforceGrowthDepartment2.optional(),
    min: z.number().int().nullable().describe(
        "The minimum headcount (inclusive).",
    ).optional(),
    max: z.number().int().nullable().describe(
        "The maximum headcount (inclusive).",
    ).optional(),
});

export const zFeatureRequirement = z.enum([
    "linkedin",
    "twitter",
    "facebook",
    "instagram",
    "angellist",
    "crunchbase",
    "youtube",
    "country",
    "city",
    "state",
    "revenue",
    "foundedYear",
    "anyFunding",
]);

export const zNullableOfFilterOperator = z.enum(["And", "Or"]).nullable()
    .describe("The operator to apply to the filters. Defaults to And.");

export const zYearRange = z.object({
    min: z.number().int().nullable().describe("The minimum year (inclusive)")
        .optional(),
    max: z.number().int().nullable().describe("The maximum year (inclusive)")
        .optional(),
}).nullable().describe("The range of years");
