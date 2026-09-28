import { z } from "zod";
import { zBooleanQuery, zPaginationQuery } from "../../../schema/common.ts";

export const zSecurityEventsQueryParams = zPaginationQuery.extend({
    source: z.string().optional(),
    chainId: z.number().int().optional(),
    severity: z.string().optional(),
    search: z.string().optional(),
    sort: z.string().optional().describe(
        "Use loss to order by loss amount; any other value orders by attack time.",
    ),
    affectsTrackedUniverse: zBooleanQuery.optional(),
    published_by: z.enum(["admin", "auto"]).optional(),
    hasLoss: zBooleanQuery.optional().describe(
        "When true, return the loss board with aggregate coverage metadata.",
    ),
});
