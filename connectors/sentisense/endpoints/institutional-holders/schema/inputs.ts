import { z } from "zod";

/** `GET /v1/institutional/holders/{ticker}` query parameters. */
export const zHoldersQueryParams = z.strictObject({
    reportDate: z.iso.date().describe(
        "13F quarter-end date, `YYYY-MM-DD` (e.g. `2026-06-30`). The API " +
            "defaults to the latest settled quarter.",
    ).optional(),
    limit: z.number().int().min(1).describe(
        "Holders per page. Setting it turns on paging and adds " +
            "`notableChanges`; the API caps a page at 1000.",
    ).optional(),
    offset: z.number().int().min(0).describe(
        "Holders to skip, for paging with `limit`. The API defaults to 0.",
    ).optional(),
    sortBy: z.enum(["shares", "valueUsd", "sharesChangePct"]).describe(
        "Sort key. The API defaults to `shares`.",
    ).optional(),
    sortDir: z.enum(["asc", "desc"]).describe(
        "Sort direction. The API defaults to `desc`.",
    ).optional(),
});
