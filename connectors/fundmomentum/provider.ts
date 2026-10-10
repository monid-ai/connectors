import { defineProvider, presets } from "@shared/core";

/**
 * Fund Momentum (fundmomentum.vc) — agentic fundraising intelligence:
 * 1,100+ actively-deploying VC funds and 700+ disclosed LPs, plus GP
 * investor-signal profiles and AI-powered startup-to-fund matching.
 *
 * WIRE: every tool is JSON-RPC 2.0 over ONE endpoint, `POST /_api/mcp`
 * (`{jsonrpc, method: "tools/call", params: {name, arguments}, id}`), so
 * the HTTP shape is identical across tools and each endpoint.ts differs
 * only in `params.name` (`toRequest`, endpoint-level) and its own
 * argument schema. The vendor answers HTTP 200 even for a logical
 * failure (unknown/ambiguous slug, a bad argument) with the verdict in
 * an `error` object in the body instead of the transport status — the
 * declarative engine judges by transport status alone, so `lifecycle.
 * start` here takes over the one exchange for every endpoint (opoint /
 * dataforseo posture) and:
 *   - relays a real non-2xx (401 bad key, 402 exhausted agent credits,
 *     403 `lp_access_required`, 429 monthly quota) untouched — already
 *     a provider error, zero usage, no translation needed;
 *   - on 200 with a body-level `error`, synthesizes a mapped httpStatus
 *     (`error_reason` "not_found" → 404, "invalid_args" → 400, anything
 *     else → 502) over `providerHttpStatus` 200, so the engine's own
 *     zero-usage-on-provider-error rule fires — matching Fund
 *     Momentum's own "checked before payment, never charged" guarantee
 *     for exactly these two cases;
 *   - on 200 with no `error`, unwraps the MCP envelope: the real payload
 *     is a JSON-encoded string at `result.content[0].text`, parsed and
 *     returned as `output`. `result._meta` (quota/credit bookkeeping —
 *     `calls_remaining`, `credits_remaining`, `cost_per_call`, …) is
 *     dropped from the output; it duplicates what Monid's own usage
 *     block already reports and never carries data the tool payload
 *     itself lacks (see e.g. `resolved_from`, which rides both places).
 *
 * BILLING: no response carries a reusable per-call delta (`_meta` is a
 * running balance/rate, not a draw), so there is no `usage.consolidate`
 * — the derived fold settles (keenable/fundable posture, no provider
 * claim). The vendor's own unit is credits at a flat €0.01 each, pool
 * `default` "Fund Momentum credits"; each endpoint declares its own
 * model against the published per-tool price (`check_lp_coverage` is
 * FREE — it never draws a credit on any tier, keyless included).
 *
 * SCOPE (v1): the four tools servable without a payment-protocol
 * integration or a second entitlement — `search_funds`, `get_fund`,
 * `get_changes`, `check_lp_coverage`. The three Pro signal tools
 * (`get_fund_signals`, `get_gp_profile`, `match_startup`) and
 * `search_lps` (sold only on a separate LP Radar subscription, never
 * per call, on credits, or over MPP) are a deliberate follow-up once
 * pricing/entitlement posture for those is settled.
 */
export default defineProvider({
    name: "fundmomentum",
    meta: {
        displayName: "Fund Momentum",
        summary: "Agentic fundraising intelligence: actively-deploying " +
            "VC funds and disclosed LPs for founders and emerging " +
            "managers.",
        description: "Fundraising intelligence for founders and " +
            "emerging fund managers — search 1,100+ VC funds that have " +
            "raised capital since September 2024 by stage, country, and " +
            "industry; pull a full fund profile with GP background and " +
            "a provenance block (source, last-checked date, " +
            "confidence); poll only what changed since a timestamp " +
            "instead of re-searching; and check LP coverage by country " +
            "and LP type across 700+ disclosed limited partners " +
            "(counts only — no name or website without an LP Radar " +
            "subscription, not sold through this connector). Every " +
            "fund profile is primary research (GP blog posts, fund " +
            "sites, published interviews), not a scraped summary.",
        homepageUrl: "https://fundmomentum.vc",
        docsUrl: "https://fundmomentum.vc/mcp",
        categories: ["funding-data"],
    },
    auth: { inject: presets.auth.header("X-API-Key") },
    request: { baseUrl: "https://fundmomentum.vc" },
    timeouts: { requestMs: 15_000, runMs: 20_000 },
    lifecycle: {
        start: async ({ utils }) => {
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const err = utils.json.optionalGet(res.body, "$.error");
            if (err !== undefined) {
                const reason = utils.json.optionalGet(
                    res.body,
                    "$.error.data.error_reason",
                );
                const status = reason === "not_found"
                    ? 404
                    : reason === "invalid_args"
                    ? 400
                    : reason === "lp_access_required"
                    ? 403
                    : 502;
                return {
                    kind: "COMPLETED",
                    httpStatus: status,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            const text = utils.json.optionalGet(
                res.body,
                "$.result.content[0].text",
            );
            const parsed = typeof text === "string"
                ? JSON.parse(text)
                : res.body;
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: parsed,
            };
        },
    },
    usage: {
        credits: { default: { label: "Fund Momentum credits" } },
    },
});
