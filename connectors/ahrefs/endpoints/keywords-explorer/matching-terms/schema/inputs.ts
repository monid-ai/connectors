import { z } from "zod";
import {
    zCountry,
    zKeywords,
    zOrderBy,
    zRowBudget,
    zWhere,
} from "../../../../schema/common.ts";

export const MATCHING_TERMS_FIELDS = [
    "keyword",
    "volume",
    "difficulty",
    "cpc",
] as const;

export const zMatchingTermsQueryParams = z.object({
    country: zCountry,
    keywords: zKeywords,
    limit: zRowBudget.optional(),
    where: zWhere(MATCHING_TERMS_FIELDS).optional(),
    order_by: zOrderBy(MATCHING_TERMS_FIELDS).optional(),
}).strict();
