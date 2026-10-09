import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * Keenable (keenable.ai) — web search and page fetch for AI agents.
 * Two synchronous REST endpoints against `https://api.keenable.ai/v1`,
 * auth `X-API-Key`.
 *
 * The catalog surface is the authenticated pair (`POST /v1/search`,
 * `GET /v1/fetch`). The keyless `/public` twins exist to evaluate the
 * API without an account (shared per-IP pool, `X-Keenable-Title`, no
 * credits) and are not exposed — design D1.
 *
 * Billing: Keenable meters authenticated usage in credits, 100,000
 * requests/month free; every SKU either doc can select (`search.pro`,
 * `search.realtime`, `fetch`, `fetch.live`, with or without `prompt`)
 * drew one credit (MCP `_meta["keenable/usage"]`, drill 2026-09-28).
 * REST responses carry no usage receipt, so there is no
 * `usage.consolidate` and the derived fold settles (design D2; same
 * posture as pdl). One pool `default`, PER_CALL 1 on the provider;
 * search overrides it so an empty result bills 0.
 */
export default defineProvider({
    name: "keenable",
    meta: {
        displayName: "Keenable",
        summary: "Low-latency web search and clean page fetch for AI agents.",
        description: "Web search and page fetch built for AI agents — " +
            "ranked results that already carry extracted page text, plus a " +
            "fetch that returns any URL as clean markdown, from the index " +
            "or live from the source. Filter search by site, publication " +
            "date, and when Keenable indexed the page; fetch can " +
            "optionally run an extraction instruction instead of " +
            "returning the whole page.",
        homepageUrl: "https://keenable.ai",
        docsUrl: "https://docs.keenable.ai",
        categories: ["web-search"],
    },
    auth: { inject: presets.auth.header("X-API-Key") },
    request: { baseUrl: "https://api.keenable.ai" },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        /** THE credit system (design D26): Keenable's native meter is
         *  credits, one per search (either mode, D3) or fetch (indexed
         *  or live, D4). No `consolidate`: no REST body carries a
         *  receipt. */
        credits: { default: { label: "Keenable credits" } },
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "call",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
