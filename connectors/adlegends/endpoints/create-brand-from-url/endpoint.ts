import { defineEndpoint } from "@shared/core";
import { zCreateBrandFromUrlBody } from "./schema/inputs.ts";

/**
 * MCP `create_brand_from_url` — cold-start Brand Memory from a website.
 * Takes ~20–90s; timeouts sit just above that window.
 */
export default defineEndpoint({
    meta: {
        displayName: "Create Brand From URL",
        summary:
            "Discover a brand from its website and save it to Brand Memory.",
        description: "Discover a brand from how it presents itself on its " +
            "website and (by default) save it to Brand Memory — the " +
            "cold-start verb. Give a URL; this reads the rendered site " +
            "(colors, fonts, logo, voice), creates a brand, and returns a " +
            "real brandId plus nextActions (get_brand / create_ads) to " +
            "chain immediately. It always returns a brandId on success or " +
            "a typed error (e.g. payment_required at your brand limit) — " +
            'never a silent "no brand". Set persist:false to preview ' +
            "without saving (needs brands:read only). Creating requires " +
            "brands:write and a key without a brand allowlist. The URL is " +
            "SSRF-validated. Takes ~20–90s. For a blank owner-owned shell " +
            "without discovery, use create_manual_brand.",
        docsUrl: "https://www.adlegends.ai/mcp",
        categories: ["agents"],
        notes: [
            "A brand-scoped key cannot create new brands.",
            "Takes ~20–90s; keep the call alive if the client supports progress.",
        ],
    },
    endpoint: "/create_brand_from_url",
    request: { method: "POST", path: "/api/mcp/brands" },
    timeouts: { requestMs: 120_000, runMs: 130_000 },
    input: {
        schema: { body: zCreateBrandFromUrlBody },
        toRequest: ({ data }) => ({
            ...data.input,
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "create_brand_from_url",
                    arguments: data.input.body ?? {},
                },
            },
        }),
    },
});
