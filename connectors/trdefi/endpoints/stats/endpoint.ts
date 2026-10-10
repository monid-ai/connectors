import { defineEndpoint } from "@shared/core";
import { z } from "zod";

/**
 * TRDEFI /api/stats — the catalogue roll-up.
 */
export default defineEndpoint({
    meta: {
        displayName: "TRDEFI Catalogue Totals",
        summary:
            "Live totals for the non-custodial liquidity catalogue — free.",
        description: "Platform-wide roll-up of the open non-custodial " +
            "liquidity catalogue: how many strategies are quoting, how many " +
            "distinct maker wallets stand behind them, how many token pairs " +
            "and networks are covered, and how much swap volume has actually " +
            "settled over the last 1, 7 and 30 days. Also returns a " +
            "per-network summary, the most traded pairs, the deepest books, " +
            "and an API-adoption funnel (readers, agents, paid prepares). " +
            "Use this to size the market; use /api/strategies to enumerate " +
            "the positions and /api/quote to price a specific one.",
        docsUrl: "https://yield.trdefi.com/docs/api",
        categories: ["defi"],
        notes: [
            "Volume is realised swap flow over trailing windows — not a " +
                "forecast, not an APY.",
        ],
    },
    request: { method: "GET", path: "/api/stats" },
    input: { schema: { queryParams: z.object({}).strict() } },
    timeouts: { requestMs: 15_000, runMs: 20_000 },
});
