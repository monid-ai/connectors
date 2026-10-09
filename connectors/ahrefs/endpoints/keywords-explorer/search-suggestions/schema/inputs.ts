import { z } from "zod";
import {
    zCountry,
    zKeywords,
    zOrderBy,
    zRowBudget,
    zWhere,
} from "../../../../schema/common.ts";

export const SEARCH_SUGGESTIONS_FIELDS = [
    "keyword",
    "volume",
    "cpc",
] as const;

export const zSearchSuggestionsQueryParams = z.object({
    country: zCountry,
    keywords: zKeywords,
    limit: zRowBudget.optional(),
    where: zWhere(SEARCH_SUGGESTIONS_FIELDS).optional(),
    order_by: zOrderBy(SEARCH_SUGGESTIONS_FIELDS).optional(),
}).strict();
