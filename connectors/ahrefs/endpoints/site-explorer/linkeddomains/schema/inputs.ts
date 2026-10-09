import { z } from "zod";
import {
    zMode,
    zOrderBy,
    zProtocol,
    zRowBudget,
    zTarget,
    zWhere,
} from "../../../../schema/common.ts";

export const LINKEDDOMAINS_FIELDS = [
    "domain",
    "domain_rating",
    "links_from_target",
    "linked_pages",
] as const;

export const zLinkeddomainsQueryParams = z.object({
    target: zTarget,
    mode: zMode.optional(),
    protocol: zProtocol.optional(),
    limit: zRowBudget.optional(),
    where: zWhere(LINKEDDOMAINS_FIELDS).optional(),
    order_by: zOrderBy(LINKEDDOMAINS_FIELDS).optional(),
}).strict();
