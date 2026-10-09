import { z } from "zod";
import {
    zMode,
    zOrderBy,
    zProtocol,
    zRowBudget,
    zTarget,
    zWhere,
} from "../../../../schema/common.ts";

export const REFDOMAINS_FIELDS = [
    "domain",
    "domain_rating",
    "links_to_target",
    "dofollow_links",
    "first_seen",
    "last_seen",
] as const;

export const zRefdomainsQueryParams = z.object({
    target: zTarget,
    mode: zMode.optional(),
    protocol: zProtocol.optional(),
    limit: zRowBudget.optional(),
    where: zWhere(REFDOMAINS_FIELDS).optional(),
    order_by: zOrderBy(REFDOMAINS_FIELDS).optional(),
}).strict();
