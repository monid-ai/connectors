import { z } from "zod";
import {
    zMode,
    zOrderBy,
    zProtocol,
    zRowBudget,
    zTarget,
    zWhere,
} from "../../../../schema/common.ts";

export const ANCHORS_FIELDS = [
    "anchor",
    "refdomains",
    "links_to_target",
    "first_seen",
    "last_seen",
] as const;

export const zAnchorsQueryParams = z.object({
    target: zTarget,
    mode: zMode.optional(),
    protocol: zProtocol.optional(),
    limit: zRowBudget.optional(),
    where: zWhere(ANCHORS_FIELDS).optional(),
    order_by: zOrderBy(ANCHORS_FIELDS).optional(),
}).strict();
