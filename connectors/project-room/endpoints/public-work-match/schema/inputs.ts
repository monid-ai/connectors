import { z } from "zod";

/**
 * Project Room POST /api/public-work/match request body — faithful
 * mirror of the vendor's OpenAPI schema (all fields optional; the
 * autoClaim ⇒ requestId requirement is a cross-field rule JSON Schema
 * expresses but zod-to-doc compilation drops, so it lives in notes).
 */
export const zRoomMatchBody = z.object({
    interests: z.array(z.string().min(1).max(100)).max(20).optional()
        .describe("Interest tags to match tasks against."),
    skills: z.array(z.string().min(1).max(100)).max(20).optional()
        .describe("Skill tags to match tasks against."),
    limit: z.number().int().min(1).max(5).optional().describe(
        "Max recommendations (server default 3, max 5).",
    ),
    after: z.string().optional().describe(
        "nextCursor from a prior bounded scan; use a new requestId " +
            "for a new autoClaim page.",
    ),
    reward: z.enum(["volunteer", "work_trade", "cash"]).optional()
        .describe(
            "Reward filter (server default 'volunteer'; the vendor's " +
                "supportedRewards list today contains only 'volunteer').",
        ),
    autoClaim: z.boolean().optional().describe(
        "When true, atomically claim at most one matching task for the " +
            "bearer identity. Requires requestId.",
    ),
    requestId: z.string().min(1).max(128).optional().describe(
        "Stable idempotency id — REQUIRED with autoClaim. Reuse the " +
            "exact same requestId after an uncertain response; never " +
            "mint a fresh one for a retry.",
    ),
    leaseHours: z.number().gt(0).max(24).optional().describe(
        "Claim lease length in hours (server default 1, max 24).",
    ),
});
