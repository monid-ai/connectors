import { z } from "zod";

/** Shared pagination accepted by Philidor's public list endpoints. */
export const zPaginationQuery = z.object({
    page: z.number().int().min(1).optional().describe(
        "One-based page number. Defaults to 1.",
    ),
    limit: z.number().int().min(1).max(100).optional().describe(
        "Rows per page, from 1 to 100. Anonymous access may apply a lower cap.",
    ),
});

export const zSortOrder = z.enum(["asc", "desc"]);
export const zBooleanQuery = z.enum(["true", "false"]);
