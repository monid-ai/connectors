import { z } from "zod";

/** `GET .../emails/{emailId}/context` query. */
export const zEmailContextQuery = z.object({
    limit: z.number().int().min(1).max(50).optional().describe(
        "Thread messages per page. The API default is 20.",
    ),
    cursor: z.string().max(2048).optional().describe(
        "Opaque next_cursor from the previous page.",
    ),
    include_held: z.boolean().optional().describe(
        "Include mail held for auto-draft. Only for the active " +
            "verification flow.",
    ),
}).strict();
