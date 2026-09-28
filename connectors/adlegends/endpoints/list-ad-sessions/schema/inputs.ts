import { z } from "zod";
import { zBrandId } from "../../../schema/common.ts";

/**
 * MCP `list_ad_sessions` arguments — hosted schema 2026-09-22.
 * `limit` optional (default 20 upstream); mirror stays optional.
 */
export const zListAdSessionsBody = z.object({
    brandId: zBrandId,
    limit: z.number().int().min(1).max(100).optional().describe(
        "Max results (default 20).",
    ),
});
