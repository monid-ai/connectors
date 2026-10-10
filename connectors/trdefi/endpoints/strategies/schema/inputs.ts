import { z } from "zod";

/** TRDEFI /api/strategies query params. All filters optional. */
export const zStrategiesQueryParams = z.object({
    chain: z.string().min(1).optional().describe(
        "Chain key to filter on — one of the keys returned by /api/chains " +
            "(e.g. 'ethereum', 'base', 'arc'), or 'all' (default).",
    ),
    filter: z.string().min(1).optional().describe(
        "Status filter: 'active' (default) returns positions currently " +
            "quoting; 'all' also includes closed ones where present.",
    ),
    pair: z.string().min(1).optional().describe(
        "Pair filter in SYMBOL_A/SYMBOL_B form (e.g. 'USDC/USDT'), or " +
            "'all' (default).",
    ),
    q: z.string().min(1).optional().describe(
        "Free-text match over pair symbols, chain name and strategy hash. " +
            "Example: 'usdc usdt'.",
    ),
    limit: z.number().int().min(1).max(500).optional().describe(
        "Rows to return, 1–500 (default 50).",
    ),
    quote_ready: z.boolean().optional().describe(
        "Set true to return only the strategies /api/quote can simulate — " +
            "USDC/USDT pairs attached to the TRDEFI router. Pick a hash " +
            "here before calling /api/quote so a UNPROCESSABLE reads as " +
            "coverage, not as a broken request.",
    ),
    source: z.string().min(1).optional().describe(
        "'catalogue' (default, the normalised roll-up) or 'scan' for a " +
            "fresh chain-by-chain scan (slower, ~10s; empty strategies and " +
            "an error field mean that chain's scan failed).",
    ),
}).strict();
