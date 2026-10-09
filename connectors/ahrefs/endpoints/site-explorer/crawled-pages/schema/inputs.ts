import { z } from "zod";
import {
    zMode,
    zOrderBy,
    zProtocol,
    zRowBudget,
    zTarget,
    zWhere,
} from "../../../../schema/common.ts";

export const CRAWLED_PAGES_FIELDS = [
    "url",
    "title",
    "url_rating",
    "http_code",
    "first_seen",
    "last_crawled",
] as const;

export const zCrawledPagesQueryParams = z.object({
    target: zTarget,
    mode: zMode.optional(),
    protocol: zProtocol.optional(),
    limit: zRowBudget.optional(),
    where: zWhere(CRAWLED_PAGES_FIELDS).optional(),
    order_by: zOrderBy(CRAWLED_PAGES_FIELDS, { single: true }).optional(),
}).strict();
