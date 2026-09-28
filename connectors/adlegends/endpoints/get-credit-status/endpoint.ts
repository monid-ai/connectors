import { defineEndpoint } from "@shared/core";
import { zGetCreditStatusBody } from "./schema/inputs.ts";

/** MCP `get_credit_status` — Legend Credit balance and billing links. */
export default defineEndpoint({
    meta: {
        displayName: "Get Credit Status",
        summary:
            "Read Legend Credit balance, subscription tier, and billing links.",
        description: "Read this account's Legend Credit balance, " +
            "subscription tier, low-credit state, auto-recharge status, " +
            "and billing links. Use this before a credit-spending MCP run " +
            "when you need to know whether the user has enough credits. " +
            "Pass requiredCredits (9 for an image Fast Ads session, 3 for " +
            "Google Search copy) so the response can compute any shortfall. " +
            "This connector does not bill those credits — the vendor does, " +
            "and the MCP envelope carries no stable meter.",
        docsUrl: "https://www.adlegends.ai/mcp",
        categories: ["agents"],
        notes: [
            "Image Fast Ads sessions charge 9 Legend Credits; Google Search " +
            "copy sessions charge 3. Call with requiredCredits set to match.",
        ],
    },
    endpoint: "/get_credit_status",
    request: { method: "POST", path: "/api/mcp/brands" },
    input: {
        schema: { body: zGetCreditStatusBody },
        toRequest: ({ data }) => ({
            ...data.input,
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "get_credit_status",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
