import { z } from "zod";
import {
    zCompanyExcludeFilters,
    zCompanyFilterFields,
    zCompanyFundingAmountRange,
    zCompanyWorkforceGrowthInput,
    zCompanyWorkforceSizeInput,
    zFeatureRequirement,
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
    ...zCompanyFilterFields,
});

export const zSearchCompaniesQuery = z.object({
    expand: z.array(z.enum(["workforce"])).describe(
        "Expandable response fields. Repeat the parameter to request multiple expansions.\n\nSupported values:\n- `workforce`: costs 5 credits per company and adds the `workforce` field to `CompanyInfo`.",
    ).optional(),
});
