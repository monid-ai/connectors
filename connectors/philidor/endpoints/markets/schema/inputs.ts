import { z } from "zod";
import { zPaginationQuery, zSortOrder } from "../../../schema/common.ts";

export const zMarketsQueryParams = zPaginationQuery.extend({
    protocol: z.string().optional(),
    version: z.string().optional(),
    chain: z.string().optional().describe(
        "Integer chain id or registry slug, such as 1, ethereum, or solana.",
    ),
    sortBy: z.enum([
        "total_supplied_usd",
        "total_borrowed_usd",
        "reserve_count",
        "name",
    ]).optional(),
    sortOrder: zSortOrder.optional(),
});
