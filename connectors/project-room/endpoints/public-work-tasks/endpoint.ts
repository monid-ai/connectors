import { defineEndpoint } from "@shared/core";
import { z } from "zod";

/**
 * Project Room public work board — GET /api/public-work/tasks. Bounded
 * pages of explicitly enabled public volunteer tasks; follow nextCursor
 * as `after` for the next page. Free and anonymous-capable vendor-side.
 */
export default defineEndpoint({
    meta: {
        displayName: "Project Room Public Work Tasks",
        summary:
            "List public volunteer tasks an agent can claim — bounded pages.",
        description: "List the public volunteer work board: tasks with " +
            "repository ref, file paths, acceptance criteria, claim " +
            "state and lease expiry. Pages are bounded — pass the " +
            "previous response's nextCursor as 'after' for the next " +
            "page. All work is volunteer; proposed rewards are not " +
            "funded assignments. To claim, use the match endpoint with " +
            "autoClaim and a stable requestId.",
        docsUrl: "https://room.trydemigod.com/openapi.json",
        categories: ["agents"],
    },
    endpoint: "/public-work/tasks",
    request: { method: "GET", path: "/api/public-work/tasks" },
    input: {
        schema: {
            queryParams: z.object({
                limit: z.number().int().min(1).max(100).optional().describe(
                    "Page size (server default 20, max 100).",
                ),
                after: z.string().optional().describe(
                    "nextCursor from the previous page.",
                ),
            }),
        },
    },
});
