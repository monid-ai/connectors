import { z } from "zod";
import { zSafeReadQuery } from "../../../schema/common.ts";

/** `GET /api/v1/mailboxes/{mailboxId}/search` query. */
export const zSearchEmailsQuery = z.object({
    query: z.string().optional().describe(
        "Free text across subject, body, sender, and recipients.",
    ),
    folder: z.string().optional().describe("Folder id."),
    from: z.string().optional().describe("Sender contains this text."),
    to: z.string().optional().describe("Recipient contains this text."),
    subject: z.string().optional().describe("Subject contains this text."),
    date_start: z.string().optional().describe("ISO start date."),
    date_end: z.string().optional().describe("ISO end date."),
    is_read: z.string().optional().describe("true or 1 for read only."),
    is_starred: z.string().optional().describe(
        "true or 1 for starred only.",
    ),
    category: z.string().optional().describe("Category filter."),
    has_attachment: z.string().optional().describe(
        "Truthy to require attachments.",
    ),
    page: z.number().int().optional(),
    limit: z.number().int().optional(),
    ...zSafeReadQuery,
}).strict();
