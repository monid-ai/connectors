import { defineEndpoint } from "@shared/core";
import { zWhoamiBody } from "./schema/inputs.ts";

/** MCP `whoami` — confirm the key, scopes, and reachable brands. */
export default defineEndpoint({
    meta: {
        displayName: "Who Am I",
        summary:
            "Confirm the authenticated account, this API key's scopes, and reachable brands.",
        description: "Return the authenticated account, this API key's " +
            "scopes, and the brands it can act on. Confirms the connection " +
            "works. For the next creative step (make an ad, brief, video), " +
            "call get_started instead of guessing from the catalog.",
        docsUrl: "https://www.adlegends.ai/mcp",
        categories: ["agents"],
    },
    endpoint: "/whoami",
    request: { method: "POST", path: "/api/mcp/brands" },
    input: {
        schema: { body: zWhoamiBody },
        toRequest: ({ data }) => ({
            ...data.input,
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "whoami",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
