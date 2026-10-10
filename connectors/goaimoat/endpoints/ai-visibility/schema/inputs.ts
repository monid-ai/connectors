import { z } from "zod";

/**
 * GoAI Moat AI Visibility Audit request body.
 */
export const zAuditBody = z.object({
    brand_name: z.string().min(1).describe("The brand or company to audit."),
    category: z.string().optional().describe(
        "Product or service category (e.g. \"phone case\", \"DTC fashion\").",
    ),
    score: z.number().int().min(0).max(30).optional().describe(
        "Optional known 0-30 checklist score. If provided, a tier + fix plan is included.",
    ),
}).strict();
