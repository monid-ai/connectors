import { z } from "zod";

/** `GET /api/v1/mailboxes` query. API keys stay on their bound workspace. */
export const zListMailboxesQuery = z.object({
    workspaceId: z.string().optional().describe(
        "Optional workspace id. An API key ignores a different workspace " +
            "and returns 403 workspace_scope_denied if the value does not " +
            "match.",
    ),
}).strict();
