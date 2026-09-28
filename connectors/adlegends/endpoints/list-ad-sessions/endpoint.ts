import { defineEndpoint } from "@shared/core";
import { zListAdSessionsBody } from "./schema/inputs.ts";

/** MCP `list_ad_sessions` — a brand's Fast Ads sessions, newest first. */
export default defineEndpoint({
    meta: {
        displayName: "List Ad Sessions",
        summary:
            "List a brand's Fast Ads sessions (newest first) with status and progress.",
        description: "List a brand's Fast Ads generation sessions (newest " +
            "first) with status, progress, and version. Pass brandId from " +
            "list_brands. Use a returned session id with get_ad_session to " +
            "read ads and stage.",
        docsUrl: "https://www.adlegends.ai/mcp",
        categories: ["image-generation", "agents"],
    },
    endpoint: "/list_ad_sessions",
    request: { method: "POST", path: "/api/mcp/brands" },
    input: {
        schema: { body: zListAdSessionsBody },
        toRequest: ({ data }) => ({
            ...data.input,
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "list_ad_sessions",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
