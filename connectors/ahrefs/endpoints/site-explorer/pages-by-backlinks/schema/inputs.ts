import { z } from "zod";
import {
    zMode,
    zOrderBy,
    zProtocol,
    zRowBudget,
    zTarget,
    zWhere,
} from "../../../../schema/common.ts";

export const PAGES_BY_BACKLINKS_FIELDS = [
    "url_to",
    "title_target",
    "links_to_target",
    "refdomains_target",
] as const;

/** `title_target` is selectable but NOT sortable upstream (drill-measured). */
export const PAGES_BY_BACKLINKS_FIELDS_SORTABLE = PAGES_BY_BACKLINKS_FIELDS
    .filter(
        (field) => !["title_target"].includes(field),
    );

export const zPagesByBacklinksQueryParams = z.object({
    target: zTarget,
    mode: zMode.optional(),
    protocol: zProtocol.optional(),
    limit: zRowBudget.optional(),
    where: zWhere(PAGES_BY_BACKLINKS_FIELDS).optional(),
    order_by: zOrderBy(PAGES_BY_BACKLINKS_FIELDS, {
        sortable: PAGES_BY_BACKLINKS_FIELDS_SORTABLE,
    }).optional(),
}).strict();
