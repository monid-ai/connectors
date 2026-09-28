import { z } from "zod";

/** MCP `get_ad_session` arguments — hosted schema 2026-09-22. */
export const zGetAdSessionBody = z.object({
    sessionId: z.number().int().describe(
        "The ad session id (from create_ads or list_ad_sessions).",
    ),
});
