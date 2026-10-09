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

export const ORGANIC_COMPETITORS_FIELDS = [
    "competitor_domain",
    "domain_rating",
    "keywords_common",
    "share",
    "traffic",
] as const;

export const zOrganicCompetitorsQueryParams = z.object({
    target: zTarget,
    date: zDate,
    country: zCountry,
    mode: zMode.optional(),
    protocol: zProtocol.optional(),
    limit: zRowBudget.optional(),
    where: zWhere(ORGANIC_COMPETITORS_FIELDS).optional(),
    order_by: zOrderBy(ORGANIC_COMPETITORS_FIELDS).optional(),
}).strict();
