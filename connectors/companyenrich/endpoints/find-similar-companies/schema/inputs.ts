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

/** Vendor input mirror: https://docs.companyenrich.com/reference/post_companies-similar
 * OpenAPI checked 2026-10-07; no connector defaults in this mirror. */

export const zCompanySimilarPageInput = z.object({
    domain: z.string().nullable().describe(
        "The domain to find similar companies for. This is deprecated, use `domains` instead. Using `domains` with a single domain acts the same as using the `domain` parameter.",
    ).optional(),
    page: z.number().int().describe(
        "The page number to return. Must be greater than 0",
    ).optional(),
    pageSize: z.number().int().min(1).max(100).describe(
        "The number of results to return. Must be between 1 and 100",
    ).optional(),
    domains: z.array(z.string()).min(1).max(10).describe(
        "The domains to find similar companies for. Up to 10 domains are allowed.",
    ).optional(),
    similarityWeight: z.number().min(-1).max(1).describe(
        "The similarity weight to apply to the results. Must be between -1 and 1. 0 is default. Larger values will prioritize more similar companies, smaller values will prioritize more established companies.",
    ).optional(),
    minScore: z.number().min(0).max(1).nullable().describe(
        "The minimum similarity score required for results. Must be between 0 and 1. When omitted, the default cutoff is used.",
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

export const zSimilarCompaniesQuery = z.object({
    expand: z.array(z.enum(["workforce"])).describe(
        "Expandable response fields. Repeat the parameter to request multiple expansions.\n\nSupported values:\n- `workforce`: costs 5 credits per company and adds the `workforce` field to `CompanyInfo`.",
    ).optional(),
    waitForEnrichment: z.boolean().describe(
        "Whether to wait for on-demand enrichment when a seed company is not stored yet. When false, valid missing domains are scheduled for background enrichment and the request returns a 404 if any seed company is missing, so it can be retried with a stable seed set later. This only controls seed-company enrichment; preparing a similarity vector for a stored company may still require processing.",
    ).optional(),
});
