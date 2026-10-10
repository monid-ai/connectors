import { z } from "zod";

/**
 * `get_changes` tool arguments (fundmomentum.vc, README "Incremental
 * sync" / "Tool reference", 2026-10). `since` accepts an ISO 8601
 * timestamp or a unix epoch in milliseconds AS A STRING; omitted, the
 * vendor defaults to the last 7 days on an agent key (30 on a human
 * free key — the agent tier only ever sees the 7-day floor). `limit`
 * bounds (1–200, default 50) live at the binding in endpoint.ts.
 */
export const zFundmomentumGetChangesArgs = z.looseObject({
    since: z.string().describe(
        "ISO 8601 timestamp, or a unix epoch in milliseconds as a " +
            "string. Omit for the last 7 days (agent-tier default).",
    ).optional(),
    if_none_match: z.string().describe(
        "The previous response's 'etag', for a conditional poll: an " +
            "unchanged window answers 'unchanged: true' with zero rows.",
    ).optional(),
    limit: z.number().int().describe(
        "Maximum number of changed funds to return (1–200). Default " +
            "50.",
    ).optional(),
});
