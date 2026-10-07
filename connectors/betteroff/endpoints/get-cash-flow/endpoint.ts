import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff Cash flow",
        summary:
            "Read income, expenses, prior-period comparison, and projections for a date range of at most 366 days.",
        description:
            "Read income, expenses, prior-period comparison, and projections for a date range of at most 366 days. Requires cashflow:read in the household OAuth grant. Preserve dates, warnings, quality, evidence, and pagination in the result.",
    },
    endpoint: "/get_cash_flow",
    request: { method: "POST", path: "/mcp" },
    input: {
        schema: { body: zBody },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "betteroff_get_cash_flow",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
