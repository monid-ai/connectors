import { defineEndpoint } from "@shared/core";
import { zBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "BetterOff Setup status",
        summary:
            "Read connected-account coverage and connections that need repair. Cannot complete setup or change billing.",
        description:
            "Read connected-account coverage and connections that need repair. Cannot complete setup or change billing. Requires accounts:read in the household OAuth grant. Preserve dates, warnings, quality, evidence, and pagination in the result.",
    },
    endpoint: "/get_setup_status",
    request: { method: "POST", path: "/mcp" },
    input: {
        schema: { body: zBody },
        toRequest: ({ data }) => ({
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "betteroff_get_setup_status",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
