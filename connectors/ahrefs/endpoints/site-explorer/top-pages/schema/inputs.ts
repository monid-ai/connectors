import { z } from "zod";
import {
    zCountry,
    zDate,
    zMode,
    zOrderBy,
    zProtocol,
    zRowBudget,
    zTarget,
    zWhere,
} from "../../../../schema/common.ts";

export const TOP_PAGES_FIELDS = [
    "url",
    "sum_traffic",
    "top_keyword",
    "top_keyword_volume",
    "top_keyword_best_position",
] as const;

export const zTopPagesQueryParams = z.object({
    target: zTarget,
    date: zDate,
    country: zCountry.optional(),
    mode: zMode.optional(),
    protocol: zProtocol.optional(),
    limit: zRowBudget.optional(),
    where: zWhere(TOP_PAGES_FIELDS).optional(),
    order_by: zOrderBy(TOP_PAGES_FIELDS).optional(),
}).strict();
