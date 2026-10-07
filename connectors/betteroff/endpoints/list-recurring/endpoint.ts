import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff Recurring streams",
        summary:
            "Read Plaid-reported recurring bills and income, including active and inactive streams. Does not establish a payment history or verified subscription classification.",
        description:
            "Read Plaid-reported recurring bills and income, including active and inactive streams. Does not establish a payment history or verified subscription classification. Requires cashflow:read in the household OAuth grant. Preserve dates, warnings, quality, evidence, and pagination in the result.",
    },
    endpoint: "/list_recurring",
    request: { method: "POST", path: "/mcp" },
    input: {
        schema: { body: zBody },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "betteroff_list_recurring",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
