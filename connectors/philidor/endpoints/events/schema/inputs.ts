import { z } from "zod";
import { zPaginationQuery, zSortOrder } from "../../../schema/common.ts";

export const zEventsQueryParams = zPaginationQuery.extend({
    eventType: z.enum([
        "Incident",
        "ParameterChange",
        "Pause",
        "Deprecation",
        "AllocationChange",
        "BadDebt",
        "DepositabilityChange",
        "RatingChange",
        "NewsImpact",
        "ProxyUpgrade",
        "ProxyAdminChange",
        "ReviewStatusChange",
    ]).optional(),
    severity: z.enum(["Critical", "Warning", "Info"]).optional(),
    protocolId: z.string().optional(),
    curatorId: z.string().optional(),
    chainId: z.string().optional().describe(
        "Integer chain id or registry slug, such as 1, ethereum, or solana.",
    ),
    incidentSeverity: z.enum(["minor", "major"]).optional(),
    remediationStatus: z.enum(["resolved", "unresolved"]).optional(),
    search: z.string().optional(),
    excludeSource: z.string().optional(),
    relevance: z.literal("highlights").optional().describe(
        "Return curated material incidents, realized losses, critical pauses, and critical peg dislocations.",
    ),
    sortBy: z.string().optional(),
    sortOrder: zSortOrder.optional(),
    daysBack: z.number().int().min(1).max(730).optional(),
});
