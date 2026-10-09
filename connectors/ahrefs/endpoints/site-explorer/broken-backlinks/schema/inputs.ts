import { z } from "zod";
import {
    zMode,
    zOrderBy,
    zProtocol,
    zRowBudget,
    zTarget,
    zWhere,
} from "../../../../schema/common.ts";

export const BROKEN_BACKLINKS_FIELDS = [
    "url_from",
    "url_to",
    "anchor",
    "title",
    "domain_rating_source",
    "first_seen",
    "http_code_target",
    "redirect_code",
    "is_dofollow",
] as const;

/** `http_code_target` is selectable but NOT sortable upstream (drill-measured). */
export const BROKEN_BACKLINKS_FIELDS_SORTABLE = BROKEN_BACKLINKS_FIELDS.filter(
    (field) => !["http_code_target"].includes(field),
);

export const zBrokenBacklinksQueryParams = z.object({
    target: zTarget,
    mode: zMode.optional(),
    protocol: zProtocol.optional(),
    limit: zRowBudget.optional(),
    where: zWhere(BROKEN_BACKLINKS_FIELDS).optional(),
    order_by: zOrderBy(BROKEN_BACKLINKS_FIELDS, {
        sortable: BROKEN_BACKLINKS_FIELDS_SORTABLE,
    }).optional(),
}).strict();
