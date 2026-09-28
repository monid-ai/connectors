import { defineEndpoint } from "@shared/core";
import { zListBrandsBody } from "./schema/inputs.ts";

/** MCP `list_brands` — brands this key can access. */
export default defineEndpoint({
    meta: {
        displayName: "List Brands",
        summary:
            "List brands this key can access, with ownership and Fast Ads permission.",
        description: "List the brands this key can access (id, name, " +
            "domain, isOwner, canGenerateAds). canGenerateAds is true for " +
            "the owner or any accepted collaborator — use those brands with " +
            "create_ads and peer generate tools; the caller pays. Pass a " +
            "returned id to get_brand or get_brand_memory.",
        docsUrl: "https://www.adlegends.ai/mcp",
        categories: ["agents"],
    },
    endpoint: "/list_brands",
    request: { method: "POST", path: "/api/mcp/brands" },
    input: {
        schema: { body: zListBrandsBody },
        toRequest: ({ data }) => ({
            ...data.input,
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "list_brands",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
