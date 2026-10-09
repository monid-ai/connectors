import { z } from "zod";
import {
    zMode,
    zOrderBy,
    zProtocol,
    zRowBudget,
    zTarget,
    zWhere,
} from "../../../../schema/common.ts";

export const LINKED_ANCHORS_INTERNAL_FIELDS = [
    "anchor",
    "links_from_target",
    "linked_pages",
    "first_seen",
] as const;

export const zLinkedAnchorsInternalQueryParams = z.object({
    target: zTarget,
    mode: zMode.optional(),
    protocol: zProtocol.optional(),
    limit: zRowBudget.optional(),
    where: zWhere(LINKED_ANCHORS_INTERNAL_FIELDS).optional(),
    order_by: zOrderBy(LINKED_ANCHORS_INTERNAL_FIELDS).optional(),
}).strict();
