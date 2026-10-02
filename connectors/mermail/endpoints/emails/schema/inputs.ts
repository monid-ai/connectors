import { z } from "zod";
import { zSafeReadQuery } from "../../../schema/common.ts";

/** `GET /api/v1/mailboxes/{mailboxId}/emails` query. */
export const zListEmailsQuery = z.object({
    folder: z.string().optional().describe("Folder id."),
    thread_id: z.string().optional().describe("Filter by thread id."),
    category: z.enum([
        "customer_support",
        "technical",
        "partnership",
        "other",
    ]).optional(),
    custom_label: z.string().optional().describe("Custom label slug."),
    is_starred: z.string().optional().describe("true/1 or false/0."),
    is_read: z.string().optional().describe("true/1 or false/0."),
    threaded: z.string().optional().describe(
        "Set to true or 1 to aggregate by thread.",
    ),
    page: z.number().int().min(1).optional().describe("Page number, from 1."),
    limit: z.number().int().min(1).max(100).optional().describe(
        "Page size. The API default is 25.",
    ),
    sortColumn: z.enum([
        "id",
        "subject",
        "sender",
        "recipient",
        "date",
        "read",
        "starred",
    ]).optional(),
    sortDirection: z.string().optional().describe(
        "ASC for ascending. Any other value is descending.",
    ),
    ...zSafeReadQuery,
}).strict();
