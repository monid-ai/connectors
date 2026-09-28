import { defineEndpoint } from "@shared/core";
import { zGetBrandMemoryBody } from "./schema/inputs.ts";

/** MCP `get_brand_memory` — durable facts that shape generation. */
export default defineEndpoint({
    meta: {
        displayName: "Get Brand Memory",
        summary:
            "Read a brand's durable memory: facts that shape generation and saved one-liners.",
        description: "Read a brand's durable memory: the facts that shape " +
            "every generation and the saved one-liner swipe file. Pass " +
            "brandId from list_brands. For a short overview (name, domain, " +
            "guideline flag), use get_brand instead.",
        docsUrl: "https://www.adlegends.ai/mcp",
        categories: ["agents"],
    },
    endpoint: "/get_brand_memory",
    request: { method: "POST", path: "/api/mcp/brands" },
    input: {
        schema: { body: zGetBrandMemoryBody },
        toRequest: ({ data }) => ({
            ...data.input,
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "get_brand_memory",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
