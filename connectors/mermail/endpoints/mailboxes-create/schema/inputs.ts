import { z } from "zod";

const zAgentInbox = z.object({
    mode: z.enum(["standard", "verification"]).optional().describe(
        "Use verification only for a verification-focused inbox.",
    ),
    automationsEnabled: z.boolean().optional().describe(
        "Set false for a verification-only inbox.",
    ),
    requireCleanScanForAutomation: z.boolean().optional().describe(
        "When true, a skipped or unavailable scan suppresses inbound " +
            "automation without rejecting delivery.",
    ),
}).strict();

/**
 * `POST /api/v1/mailboxes` body. `settings` is limited to the documented
 * `agentInbox` object so an unknown settings key cannot ride along on a
 * 10-credit create.
 */
export const zCreateMailboxBody = z.object({
    email: z.email().describe(
        "Mailbox address on @mermail.app or a verified custom domain.",
    ),
    name: z.string().min(1).describe(
        "Display name. Also seeds settings.fromName.",
    ),
    workspaceId: z.string().optional().describe(
        "Optional. When set, it must match the API key's workspace.",
    ),
    settings: z.object({
        agentInbox: zAgentInbox.optional().describe(
            "Omit to keep standard mailbox behavior.",
        ),
    }).strict().optional(),
}).strict();
