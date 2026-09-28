import { defineEndpoint } from "@shared/core";
import { zCreateAdsBody } from "./schema/inputs.ts";

/**
 * MCP `create_ads` — start a Fast Ads session. Returns immediately with
 * {sessionId, status:"processing"}; poll get_ad_session.
 */
export default defineEndpoint({
    meta: {
        displayName: "Create Ads",
        summary:
            "Start an on-brand Fast Ads session; poll get_ad_session until it completes.",
        description: "Start generating on-brand ads for a brand with Fast " +
            "Ads. Need a brandId first (get_started, list_brands, or " +
            "create_brand_from_url). If you do not know the workflow, call " +
            "get_started instead of inventing a tool. Provide a strategy " +
            "(target audience, key message, tone). Image sessions charge 9 " +
            "Legend Credits (refunded on failure); Google Search text-only " +
            "sessions charge 3. Generation takes ~2–4 minutes and runs in " +
            "the background: this returns immediately with {sessionId, " +
            'status:"processing"}. Then poll get_ad_session with that ' +
            "sessionId every ~20–30s. Pass pack_type for a live kit (meta, " +
            "linkedin, google_search, youtube, tiktok, x, chatgpt). These " +
            "are creative drafts and setup notes — they do not publish or " +
            "buy media.",
        docsUrl: "https://www.adlegends.ai/mcp",
        categories: ["image-generation", "agents"],
        notes: [
            "Image sessions charge 9 Legend Credits; Google Search copy " +
            "sessions charge 3. This connector models usage as FREE — the " +
            "MCP envelope carries no stable wire meter.",
            "Returns immediately. Poll get_ad_session until status is " +
            "completed, partial, or failed.",
        ],
    },
    endpoint: "/create_ads",
    request: { method: "POST", path: "/api/mcp/brands" },
    timeouts: { requestMs: 60_000, runMs: 90_000 },
    input: {
        schema: { body: zCreateAdsBody },
        toRequest: ({ data }) => ({
            ...data.input,
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "create_ads",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
