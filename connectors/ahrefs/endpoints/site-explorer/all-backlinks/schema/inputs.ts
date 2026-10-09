import { z } from "zod";
import {
    zMode,
    zOrderBy,
    zProtocol,
    zRowBudget,
    zTarget,
    zWhere,
} from "../../../../schema/common.ts";

export const ALL_BACKLINKS_FIELDS = [
    "url_from",
    "url_to",
    "anchor",
    "title",
    "domain_rating_source",
    "url_rating_source",
    "first_seen",
    "last_seen",
    "is_dofollow",
    "link_type",
] as const;

export const zAllBacklinksQueryParams = z.object({
    target: zTarget,
    mode: zMode.optional(),
    protocol: zProtocol.optional(),
    limit: zRowBudget.optional(),
    where: zWhere(ALL_BACKLINKS_FIELDS).optional(),
    order_by: zOrderBy(ALL_BACKLINKS_FIELDS).optional(),
}).strict();
