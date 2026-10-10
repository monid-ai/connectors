import { defineProvider, UsageModelKind } from "@shared/core";
import { z } from "zod";

/**
 * TRDEFI (yield.trdefi.com) — the live non-custodial liquidity catalogue.
 * Six keyless, free, read-only endpoints over a { data, meta } envelope.
 * The prepare path (/v1/positions, /v1/swaps) is x402-pay-per-request and is
 * deliberately NOT exposed here; see meta.description.
 *
 * KEYLESS: the read surface needs no credential, so `auth.inject` is a
 * pass-through and `credentials` is the EMPTY shape — no env var, no secret.
 */
export default defineProvider({
    name: "trdefi",
    meta: {
        displayName: "TRDEFI Liquidity",
        summary:
            "Live non-custodial stablecoin liquidity catalogue: strategies, chains, quotes — free.",
        description: "TRDEFI Liquidity is a live, read-only roll-up of the " +
            "open non-custodial liquidity catalogue: maker positions quoting " +
            "on-chain, across 20 networks including Ethereum, Base, " +
            "Arbitrum, Optimism, Polygon and Arc. Six free endpoints " +
            "describe the catalogue at three depths — platform totals " +
            "(strategies, makers, pairs, settled volume), per-network and " +
            "per-pair lists of open positions with their maker quotes and " +
            "depth, and an on-chain simulated fill quote for a specific " +
            "position — plus a strategy-detail lookup by hash and a " +
            "shields.io badge payload. Everything is GET with query " +
            "parameters, no API key, no rate-limit token. Volume figures are " +
            "REALISED swap flow over trailing windows, never forecasts. " +
            "The prepare path (POST /v1/positions and /v1/swaps) returns " +
            "unsigned transactions for a caller-signed trade and is paid " +
            "per request in USDC via x402 — see " +
            "https://yield.trdefi.com/docs/api.",
        homepageUrl: "https://yield.trdefi.com",
        docsUrl: "https://yield.trdefi.com/docs/api",
        categories: ["defi", "yields", "onchain-data"],
        notes: [
            "All six endpoints are read-only and keyless; the x402 prepare " +
                "path (/v1/positions, /v1/swaps) is not part of this connector.",
            "Read responses are computed live per request and cached for " +
                "60 seconds server-side; roll-up freshness is in meta.",
        ],
    },
    auth: {
        // Keyless surface: pass the request through untouched.
        inject: ({ data }) => data.request,
        // Empty credential shape — the engine therefore requires NO env var
        // and validates nothing; the injector still runs, harmless.
        credentials: z.object({}),
    },
    request: { baseUrl: "https://yield.trdefi.com" },
    timeouts: { requestMs: 15_000, runMs: 20_000 },
    usage: {
        model: { kind: UsageModelKind.FREE },
    },
});
