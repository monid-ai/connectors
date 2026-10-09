import { z } from "zod";
import {
    zCountry,
    zKeywords,
    zOrderBy,
    zRowBudget,
    zWhere,
} from "../../../../schema/common.ts";

export const RELATED_TERMS_FIELDS = [
    "keyword",
    "volume",
    "difficulty",
    "cpc",
] as const;

export const zRelatedTermsQueryParams = z.object({
    country: zCountry,
    keywords: zKeywords,
    limit: zRowBudget.optional(),
    where: zWhere(RELATED_TERMS_FIELDS).optional(),
    order_by: zOrderBy(RELATED_TERMS_FIELDS).optional(),
}).strict();
