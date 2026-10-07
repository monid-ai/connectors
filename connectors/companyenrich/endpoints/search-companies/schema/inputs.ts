import { z } from "zod";
import {
    zCompanyCategory,
    zCompanyEmployees,
    zCompanyExcludeFilters,
    zCompanyFundingAmountRange,
    zCompanyFundingRound,
    zCompanyRevenue,
    zCompanyType,
    zCompanyWorkforceGrowthInput,
    zCompanyWorkforceSizeInput,
    zFeatureRequirement,
    zNullableOfCompanyWorkforceGrowthDepartment,
    zNullableOfCompanyWorkforceGrowthDepartment2,
    zNullableOfCompanyWorkforceGrowthPeriod,
    zNullableOfFilterOperator,
    zYearRange,
} from "../../../schema/common.ts";

/** Vendor input mirror: https://docs.companyenrich.com/reference/post_companies-search
 * OpenAPI checked 2026-10-07; no connector defaults in this mirror. */

export const zCompanySearchPageInput = z.object({
    page: z.number().int().describe(
        "The page number to return. Must be greater than 0",
    ).optional(),
    pageSize: z.number().int().min(1).max(100).describe(
        "The number of results to return in each page. Must be between 1 and 100",
    ).optional(),
    lists: z.array(z.uuid()).nullable().describe("The list IDs to filter by")
        .optional(),
    semanticQuery: z.string().max(500).nullable().describe(
        "The semantic search query to find companies with. More natural language version of the standard query.",
    ).optional(),
    semanticWeight: z.number().min(0).max(1).nullable().describe(
        "The semantic weight to apply to the results. Must be between 0 and 1. 0.7 is default. Larger values will prioritize semantic similarity, smaller values will prioritize traditional search factors.",
    ).optional(),
    exclude: zCompanyExcludeFilters.optional(),
    query: z.string().max(250).nullable().describe(
        "The search query to apply on the company name and domain",
    ).optional(),
    foundedYear: zYearRange.optional(),
    fundingAmount: zCompanyFundingAmountRange.optional(),
    fundingYear: zYearRange.optional(),
    categoryOperator: zNullableOfFilterOperator.optional(),
    keywordsOperator: zNullableOfFilterOperator.optional(),
    technologiesOperator: zNullableOfFilterOperator.optional(),
    workforceGrowth: zCompanyWorkforceGrowthInput.optional(),
    workforceSize: z.array(zCompanyWorkforceSizeInput).nullable().describe(
        "Filter companies by absolute workforce headcount. Multiple entries can be provided to filter on different departments simultaneously.",
    ).optional(),
    require: z.array(zFeatureRequirement).nullable().describe(
        "The features that must exist for the company",
    ).optional(),
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
});

export const zSearchCompaniesQuery = z.object({
    expand: z.array(z.enum(["workforce"])).describe(
        "Expandable response fields. Repeat the parameter to request multiple expansions.\n\nSupported values:\n- `workforce`: costs 5 credits per company and adds the `workforce` field to `CompanyInfo`.",
    ).optional(),
});
