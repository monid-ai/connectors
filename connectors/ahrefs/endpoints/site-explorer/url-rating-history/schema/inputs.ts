import { z } from "zod";
import {
    zDateFrom,
    zDateTo,
    zHistoryGrouping,
    zTarget,
} from "../../../../schema/common.ts";

export const zUrlRatingHistoryQueryParams = z.object({
    target: zTarget,
    date_from: zDateFrom,
    date_to: zDateTo.optional(),
    history_grouping: zHistoryGrouping.optional(),
}).strict();
