import { defineEndpoint } from "@shared/core";
import { zGetAdSessionBody } from "./schema/inputs.ts";

/** MCP `get_ad_session` — poll a Fast Ads session manifest. */
export default defineEndpoint({
    meta: {
        displayName: "Get Ad Session",
        summary:
            "Fetch a Fast Ads session: status, stage, progress, ads, and animation runs.",
        description: "Fetch a Fast Ads session manifest: status, a " +
            "human-readable stage, progress %, generated ads, requested/" +
            "resolved logoRendering evidence, and durable animationRuns. " +
            "Each asset carries its short-lived signed URL, placement, " +
            "copy, and the logo lane that shipped. Use this to poll " +
            "create_ads every ~20–30s; that run is finished when status is " +
            "completed, partial, or failed. Google Search kits return " +
            "copy, not images. Session reads do not settle kit refunds.",
        docsUrl: "https://www.adlegends.ai/mcp",
        categories: ["image-generation", "agents"],
        notes: [
            "Poll every ~20–30s after create_ads. Signed asset URLs expire.",
        ],
    },
    endpoint: "/get_ad_session",
    request: { method: "POST", path: "/api/mcp/brands" },
    input: {
        schema: { body: zGetAdSessionBody },
        toRequest: ({ data }) => ({
            ...data.input,
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "get_ad_session",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
