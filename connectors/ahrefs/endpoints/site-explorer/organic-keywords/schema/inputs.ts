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

export const ORGANIC_KEYWORDS_FIELDS = [
    "keyword",
    "best_position",
    "best_position_url",
    "volume",
    "sum_traffic",
    "cpc",
] as const;

export const zOrganicKeywordsQueryParams = z.object({
    target: zTarget,
    date: zDate,
    country: zCountry.optional(),
    mode: zMode.optional(),
    protocol: zProtocol.optional(),
    limit: zRowBudget.optional(),
    where: zWhere(ORGANIC_KEYWORDS_FIELDS).optional(),
    order_by: zOrderBy(ORGANIC_KEYWORDS_FIELDS).optional(),
}).strict();
