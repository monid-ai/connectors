import { z } from "zod";
import { zSafeReadQuery } from "../../../schema/common.ts";

/** `GET /api/v1/mailboxes/{mailboxId}/emails/{emailId}` query. */
export const zGetEmailQuery = z.object({
    ...zSafeReadQuery,
    max_body_chars: z.number().int().positive().max(100_000).optional()
        .describe(
            "Character cap for the returned body. Does not change the " +
                "stored message. The server ceiling is 100000.",
        ),
}).strict();
