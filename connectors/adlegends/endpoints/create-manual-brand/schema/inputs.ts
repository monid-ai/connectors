import { z } from "zod";
import { zRequestId } from "../../../schema/common.ts";

/**
 * MCP `create_manual_brand` arguments — hosted schema 2026-09-22.
 * `name` and `requestId` required; no discovery or domain dedupe.
 */
export const zCreateManualBrandBody = z.object({
    name: z.string().min(1).max(200).describe(
        "Unique human-readable label for this manual shell, e.g. " +
            '"Turtle Wax — Experimental". This is never deduped.',
    ),
    requestId: zRequestId,
    description: z.string().max(10000).optional().describe(
        "Optional manual description. No AI discovery or enrichment occurs.",
    ),
    domain: z.string().max(2000).optional().describe(
        "Optional stored website domain or http(s) URL. Normalized to its " +
            "hostname but never fetched and never matched to another brand.",
    ),
});
