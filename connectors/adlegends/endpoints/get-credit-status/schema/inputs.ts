import { z } from "zod";

/**
 * MCP `get_credit_status` arguments — hosted schema 2026-09-22.
 * All fields optional; used as a preflight before a credit-spending tool.
 */
export const zGetCreditStatusBody = z.object({
    requiredCredits: z.number().int().min(0).optional().describe(
        "Optional credits needed for the next action, so the response can " +
            "compute any shortfall.",
    ),
    feature: z.string().optional().describe(
        "Human label for the feature/tool the user wants to run.",
    ),
    returnPath: z.string().optional().describe(
        "Internal Ad Legends path to return to after checkout, e.g. " +
            "/settings/mcp. Must start with /.",
    ),
    reason: z.enum([
        "preflight",
        "low_credits",
        "insufficient_credits",
        "entitlement_required",
        "payment_failed",
    ]).optional().describe(
        "Why the balance is being checked. Usually omitted for normal preflight.",
    ),
});
