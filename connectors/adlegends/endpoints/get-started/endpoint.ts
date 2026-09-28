import { defineEndpoint } from "@shared/core";
import { zGetStartedBody } from "./schema/inputs.ts";

/**
 * MCP `get_started` — CALL THIS FIRST. Returns live ad kits, next tool,
 * pipeline, and credit costs. Free upstream.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Started",
        summary:
            "First call after connect: live ad kits, next tool, pipeline, and credit costs.",
        description: "Call this first when you just connected or do not " +
            "know the next tool. Use it for ads, paid-media planning, " +
            "briefs, video, or Cold Open instead of scanning the catalog. " +
            "Returns live ad kits with pack_type, outputs, supported tools " +
            "and prices, plus the next MCP tool, the resolved pipeline, " +
            "credit costs, and when-NOT-to-use. For make_an_ad, pass " +
            "pack_type to preserve the requested kit. Free; no credits. " +
            "This is the brand/creative server — not staff, cancel, or " +
            "refund tools. After this, use create_brand_from_url, " +
            "create_ads, or get_credit_status as directed.",
        docsUrl: "https://www.adlegends.ai/mcp",
        categories: ["agents"],
        notes: [
            "Default intent is make_an_ad. pack_type is ignored for other intents.",
        ],
    },
    endpoint: "/get_started",
    request: { method: "POST", path: "/api/mcp/brands" },
    input: {
        schema: { body: zGetStartedBody },
        toRequest: ({ data }) => ({
            ...data.input,
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "get_started",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
