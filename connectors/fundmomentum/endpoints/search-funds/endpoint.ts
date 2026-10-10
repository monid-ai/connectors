import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zFundmomentumSearchFundsArgs } from "./schema/inputs.ts";

/**
 * `search_funds` — search actively-deploying VC funds by stage, country,
 * and industry. Free tool: 1 credit (€0.01) per call on the agent tier,
 * flat regardless of how many funds match (no empty-result discount is
 * published, unlike e.g. keenable's search). `slug` values on the
 * returned funds are not derivable from the display name — call this
 * before `get_fund` rather than guessing one.
 */
export default defineEndpoint({
    meta: {
        displayName: "Fund Momentum Search Funds",
        summary: "Search actively-deploying VC funds by stage, " +
            "country, and industry.",
        description: "Search Fund Momentum's index of 1,100+ VC funds " +
            "that have raised capital since September 2024, filtered " +
            "by funding stage, HQ country (spelled out, not an ISO " +
            "code), and industry focus. Returns each matching fund's " +
            "name, country, funding stage, fund size, and slug — the " +
            "slug is required by 'Get Fund Profile' and is not " +
            "derivable from the display name, so call this first.",
        docsUrl: "https://fundmomentum.vc/mcp",
        categories: ["funding-data"],
        notes: [
            "1 credit (€0.01) per call on the agent tier, flat " +
            "regardless of how many funds match.",
        ],
    },
    endpoint: "/mcp/search_funds",
    request: { method: "POST", path: "/_api/mcp" },
    input: {
        schema: {
            body: zFundmomentumSearchFundsArgs.extend({
                limit: zFundmomentumSearchFundsArgs.shape.limit.unwrap()
                    .min(1).max(20).optional(),
            }),
        },
        toRequest: ({ data }) => ({
            ...data.input,
            body: {
                jsonrpc: "2.0",
                method: "tools/call",
                params: {
                    name: "search_funds",
                    arguments: data.input.body ?? {},
                },
                id: 1,
            },
        }),
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "search",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
