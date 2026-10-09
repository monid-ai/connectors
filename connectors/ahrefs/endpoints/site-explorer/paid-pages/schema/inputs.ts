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

export const PAID_PAGES_FIELDS = [
    "url",
    "sum_traffic",
    "top_keyword",
    "ads_count",
] as const;

export const zPaidPagesQueryParams = z.object({
    target: zTarget,
    date: zDate,
    country: zCountry.optional(),
    mode: zMode.optional(),
    protocol: zProtocol.optional(),
    limit: zRowBudget.optional(),
    where: zWhere(PAID_PAGES_FIELDS).optional(),
    order_by: zOrderBy(PAID_PAGES_FIELDS).optional(),
}).strict();
