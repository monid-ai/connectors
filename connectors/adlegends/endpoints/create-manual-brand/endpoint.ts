import { defineEndpoint } from "@shared/core";
import { zCreateManualBrandBody } from "./schema/inputs.ts";

/** MCP `create_manual_brand` — blank Brand Memory shell, no discovery. */
export default defineEndpoint({
    meta: {
        displayName: "Create Manual Brand",
        summary:
            "Create a blank owner-owned Brand Memory shell without website discovery.",
        description: "Create a pristine, owner-owned Brand Memory shell " +
            "without discovery or domain deduplication. Use this only when " +
            "the user explicitly wants a separate manual/blank brand — " +
            "including a deliberate duplicate of a website they already " +
            "own. For normal website onboarding, use create_brand_from_url " +
            "instead; it remains discovery-first and deduped. name is the " +
            "human-readable label; description and domain are optional " +
            "stored fields only (the domain is never fetched). requestId is " +
            "required: reuse it only for a transport retry of this exact " +
            "creation. Requires brands:write and an unrestricted key.",
        docsUrl: "https://www.adlegends.ai/mcp",
        categories: ["agents"],
        notes: [
            "A brand-scoped key cannot mint brands.",
            "requestId is a retry key, not a name — a new value creates another shell.",
        ],
    },
    endpoint: "/create_manual_brand",
    request: { method: "POST", path: "/api/mcp/brands" },
    input: {
        schema: { body: zCreateManualBrandBody },
        toRequest: ({ data }) => ({
            ...data.input,
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "create_manual_brand",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
