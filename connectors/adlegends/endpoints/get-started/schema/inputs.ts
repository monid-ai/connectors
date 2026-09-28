import { z } from "zod";
import {
    zBrandId,
    zPackType,
    zPlanningContext,
    zRequestId,
} from "../../../schema/common.ts";

/**
 * MCP `get_started` arguments — hosted schema 2026-09-22. All fields
 * optional; default intent is make_an_ad upstream.
 */
export const zGetStartedBody = z.object({
    intent: z.enum([
        "make_an_ad",
        "plan_media",
        "make_a_video",
        "make_a_video_spot",
        "write_a_brief",
        "run_the_loop",
        "explore",
        "write_cold_open",
        "improve_existing_ad",
    ]).optional().describe(
        "What the user asked for. Default make_an_ad. Use plan_media for " +
            "paid-media, write_cold_open for CMO outbound, improve_existing_ad " +
            "when the user already has an ad.",
    ),
    brandUrl: z.string().optional().describe(
        "Website or brand URL if the user named one.",
    ),
    pack_type: zPackType.optional().describe(
        "Optional live ad kit for make_an_ad.",
    ),
    brandId: zBrandId.optional(),
    campaignId: z.number().int().positive().optional().describe(
        "Stable campaign id from list_campaigns when a Media Plan should " +
            "link to an existing campaign.",
    ),
    budgetAmount: z.string().optional().describe(
        'Media Plan budget as a decimal major-unit string, e.g. "25000.00".',
    ),
    currency: z.string().optional().describe(
        "ISO-4217 budget currency for plan_media. Default USD.",
    ),
    frequency: z.enum(["weekly", "monthly", "annually"]).optional(),
    channelScope: z.enum(["digital", "digital_traditional", "full"])
        .optional(),
    planningContext: zPlanningContext.optional(),
    requestId: zRequestId.optional(),
});
