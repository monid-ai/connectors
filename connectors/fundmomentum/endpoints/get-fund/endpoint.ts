import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zFundmomentumGetFundArgs } from "./schema/inputs.ts";

/**
 * `get_fund` — full fund profile by slug. An unknown or ambiguous slug
 * is refused before any charge (synthesized 404 at the provider's
 * `lifecycle.start`, zero usage) — only a resolved profile draws the
 * flat 1 credit (€0.01).
 */
export default defineEndpoint({
    meta: {
        displayName: "Fund Momentum Get Fund Profile",
        summary: "Full VC fund profile with GP background and a " +
            "provenance block, by slug.",
        description: "Fetch the full profile for one VC fund by its " +
            "slug: GP background, investment focus, fund size, HQ " +
            "country and funding stage, plus a provenance block " +
            "naming the source, the date it was last checked, and a " +
            "confidence level. The slug comes from 'search_funds' or " +
            "'match_startup' — it is not derivable from the fund's " +
            "display name. A slug that matches no fund, or several " +
            "funds, is refused before any charge; a near-miss name " +
            "(case/spacing, or an unambiguous hyphen-boundary prefix) " +
            "still resolves and the response carries 'resolved_from'.",
        docsUrl: "https://fundmomentum.vc/mcp",
        categories: ["funding-data"],
        notes: [
            "1 credit (€0.01) per call on the agent tier. An unknown " +
            "or ambiguous slug is refused before any charge.",
        ],
    },
    endpoint: "/mcp/get_fund",
    request: { method: "POST", path: "/_api/mcp" },
    input: {
        schema: { body: zFundmomentumGetFundArgs },
        toRequest: ({ data }) => ({
            ...data.input,
            body: {
                jsonrpc: "2.0",
                method: "tools/call",
                params: {
                    name: "get_fund",
                    arguments: data.input.body ?? {},
                },
                id: 1,
            },
        }),
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "profile lookup",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
