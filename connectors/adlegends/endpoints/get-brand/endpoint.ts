import { defineEndpoint } from "@shared/core";
import { zGetBrandBody } from "./schema/inputs.ts";

/** MCP `get_brand` — overview of one brand. */
export default defineEndpoint({
    meta: {
        displayName: "Get Brand",
        summary:
            "Get a brand overview: name, description, domain, memory counts, guidelines.",
        description: "Get a brand overview: name, description, domain, " +
            "memory counts, and whether guidelines exist. Pass brandId from " +
            "list_brands or create_brand_from_url. For the facts that shape " +
            "generation, use get_brand_memory.",
        docsUrl: "https://www.adlegends.ai/mcp",
        categories: ["agents"],
    },
    endpoint: "/get_brand",
    request: { method: "POST", path: "/api/mcp/brands" },
    input: {
        schema: { body: zGetBrandBody },
        toRequest: ({ data }) => ({
            ...data.input,
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "get_brand",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
