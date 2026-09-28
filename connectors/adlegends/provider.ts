import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * Ad Legends (adlegends.ai) — brand-led creative for AI agents. The public
 * agent surface is hosted MCP over HTTPS (`POST /api/mcp/brands`), not a
 * classic OpenAPI REST catalog. Every Monid endpoint wraps one MCP tool
 * via JSON-RPC `tools/call` against that shared path; the tool name is
 * the public identity (`adlegends#get_started`, …).
 *
 * Auth is a scoped, revocable Bearer API key from `/settings/mcp`
 * (`ADLEGENDS_CREDENTIALS_API_KEY` / `ADLEGENDS_API_KEY`). Chat clients
 * can also connect with OAuth; this connector documents the CLI/script
 * Bearer convention.
 *
 * THE LIFECYCLE LIVES HERE: every endpoint is the same MCP POST, and a
 * JSON-RPC error can arrive as HTTP 200 `{error:{code,message}}` (or
 * `result.isError`). A provider-level `start` replaces declarative
 * execution on every doc — which is what we want — and synthesizes a
 * non-2xx so the engine zero-bills it. There is nothing to poll.
 *
 * BILLING: Ad Legends meters Legend Credits on paid tools (image Fast
 * Ads 9, Google Search copy 3, …) but publishes no stable wire meter on
 * the MCP envelope, so inventing a formula would violate D26/D27/D29.
 * The model is FREE; published prices ride `meta.notes` only.
 */
export default defineProvider({
    name: "adlegends",
    meta: {
        displayName: "Ad Legends",
        summary:
            "Brand Memory, on-brand Fast Ads, and creative tools for AI agents via hosted MCP.",
        description: "Ad Legends is a marketing / brand-led creative " +
            "platform for AI agents: Brand Memory, brand guidelines, Fast " +
            "Ads (on-brand image and platform-kit ads), Idea Sessions, " +
            "audiences, campaigns, and design-system import/export. The " +
            "public agent interface is MCP over HTTPS — agents must call " +
            "get_started first after connect. This connector wraps the " +
            "highest-value tools on that surface (account, brands, Fast " +
            "Ads) as Monid endpoints; it does not invent a REST catalog.",
        homepageUrl: "https://adlegends.ai",
        docsUrl: "https://www.adlegends.ai/mcp",
        categories: ["agents", "image-generation"],
        notes: [
            "Hosted MCP endpoint: POST https://www.adlegends.ai/api/mcp/brands. " +
            "Chat clients use OAuth; CLIs and this connector use a scoped " +
            "Bearer API key from https://www.adlegends.ai/settings/mcp " +
            "(ADLEGENDS_CREDENTIALS_API_KEY, alias ADLEGENDS_API_KEY).",
            "Call get_started first after connect. A brand-scoped key " +
            "cannot create brands; creating requires brands:write and an " +
            "unrestricted key.",
            "Legend Credits exist (image Fast Ads sessions 9, Google Search " +
            "copy sessions 3) but the MCP envelope carries no stable wire " +
            "meter — usage is modeled FREE. Call get_credit_status before " +
            "a credit-spending tool.",
            "create_brand_from_url takes ~20–90s. create_ads returns " +
            'immediately with {sessionId, status:"processing"}; poll ' +
            "get_ad_session every ~20–30s until completed/partial/failed. " +
            "Long MCP calls may stream SSE; this connector expects JSON.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: {
        baseUrl: "https://www.adlegends.ai",
        headers: { Accept: "application/json, text/event-stream" },
    },
    timeouts: { requestMs: 30_000, runMs: 60_000 },
    usage: {
        // FREE (D25/D26/D27): Legend Credits are real but unpublished as a
        // stable wire meter. The model ALONE suffices — quantities fns are
        // compiler-synthesized, and there is no vendor claim to consolidate.
        // A published per-tool formula would be a MODEL change, not a note.
        model: { kind: UsageModelKind.FREE },
    },
    output: {
        /** Unwrap MCP `result.structuredContent` (or `result`) so callers
         *  see the tool payload, not the JSON-RPC envelope. */
        fromResponse: ({ data, utils }) => {
            const structured = utils.json.optionalGet(
                data.output,
                "$.result.structuredContent",
            );
            if (typeof structured === "object" && structured !== null) {
                return structured;
            }
            const result = utils.json.optionalGet(data.output, "$.result");
            if (typeof result === "object" && result !== null) {
                return result;
            }
            return data.output;
        },
        /** JSON-RPC `{error:{code,message}}` and tool-level `isError`
         *  content[0].text → `{message, code?, raw}`. */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(
                data.output,
                "$.error.message",
            );
            const code = utils.json.optionalGet(data.output, "$.error.code");
            const content = utils.json.optionalGet(
                data.output,
                "$.result.content",
            );
            const first = Array.isArray(content) && content.length > 0
                ? content[0]
                : undefined;
            const toolText = first !== undefined && typeof first === "object" &&
                    first !== null
                ? utils.json.optionalGet(first, "$.text")
                : undefined;
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : typeof toolText === "string" && toolText !== ""
                    ? toolText
                    : "Ad Legends MCP error",
                ...(typeof code === "number" ? { code } : {}),
                raw: data.output,
            };
        },
    },
    lifecycle: {
        /**
         * Plain relay of the compiled MCP POST. A JSON-RPC error on HTTP
         * 200 is synthesized as COMPLETED 400 + providerHttpStatus 200 so
         * the engine treats it as provider-error data (zero usage).
         */
        start: async ({ utils }) => {
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const rpcError = utils.json.optionalGet(res.body, "$.error");
            const isToolError = utils.json.optionalGet(
                res.body,
                "$.result.isError",
            );
            if (
                (typeof rpcError === "object" && rpcError !== null) ||
                isToolError === true
            ) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 400,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
    },
});
