import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zFundmomentumGetChangesArgs } from "./schema/inputs.ts";

/**
 * `get_changes` — incremental sync: only the funds that changed since a
 * timestamp. The vendor is explicit that this, not a scheduled
 * `search_funds` re-run, is the cheap way to poll: an unchanged window
 * answers `unchanged: true` with zero rows for the same flat price.
 */
export default defineEndpoint({
    meta: {
        displayName: "Fund Momentum Get Changed Funds",
        summary: "Only the funds that changed since a timestamp — for " +
            "incremental sync, not a search re-run.",
        description: "Poll for funds added or updated since a given " +
            "timestamp, for incremental sync. Pass the previous " +
            "response's 'etag' as 'if_none_match' for a conditional " +
            "poll: an unchanged window answers 'unchanged: true' with " +
            "zero rows. Each changed row carries slug, name, country, " +
            "funding stage, fund size, change type, change timestamp, " +
            "confidence, and url — fetch the full record with 'Get " +
            "Fund Profile' only for rows actually needed. Use this " +
            "instead of re-running 'Search Funds' on a schedule.",
        docsUrl: "https://fundmomentum.vc/mcp",
        categories: ["funding-data"],
        notes: [
            "1 credit (€0.01) per call on the agent tier, including an " +
            "unchanged ('unchanged: true', zero rows) response.",
        ],
    },
    endpoint: "/mcp/get_changes",
    request: { method: "POST", path: "/_api/mcp" },
    input: {
        schema: {
            body: zFundmomentumGetChangesArgs.extend({
                limit: zFundmomentumGetChangesArgs.shape.limit.unwrap()
                    .min(1).max(200).optional(),
            }),
        },
        toRequest: ({ data }) => ({
            ...data.input,
            body: {
                jsonrpc: "2.0",
                method: "tools/call",
                params: {
                    name: "get_changes",
                    arguments: data.input.body ?? {},
                },
                id: 1,
            },
        }),
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "sync poll",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
