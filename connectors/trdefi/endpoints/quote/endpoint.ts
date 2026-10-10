import { defineEndpoint } from "@shared/core";
import { zQuoteQueryParams } from "./schema/inputs.ts";

/**
 * TRDEFI /api/quote — on-chain simulated fill for one position.
 */
export default defineEndpoint({
    meta: {
        displayName: "TRDEFI Quote",
        summary: "On-chain simulated fill quote for one liquidity position — free.",
        description: "Price an exact fill against one open position: the " +
            "strategy is simulated on-chain as it stands right now and the " +
            "result is the output amount for your input amount, plus the " +
            "effective rate and the fee schedule that produced it. Nothing " +
            "is signed and nothing is reserved — this is a simulation, not " +
            "a commitment. Quote is currently enabled for verified USDC and " +
            "USDT strategies; other pairs answer UNPROCESSABLE. Makers may " +
            "gate a strategy on the caller holding an access licence token " +
            "— pass your own address as 'from' to be priced against it. " +
            "Browsed candidates come from /api/strategies; the actual fill " +
            "is prepared on the x402 write path (POST /v1/swaps). Only " +
            "USDC/USDT strategies attached to the TRDEFI router can be " +
            "simulated; use /api/strategies?quote_ready=true to pick a " +
            "hash that is quotable.",
        docsUrl: "https://yield.trdefi.com/docs/api",
        categories: ["token-prices", "defi"],
        notes: [
            "A 422 UNPROCESSABLE with " +
                "'Quote simulation is currently enabled only for verified " +
                "USDC/USDT strategies' is a coverage limit, not an error " +
                "in the request.",
            "The simulation needs the strategy's order data; if it is " +
                "missing the response carries a revert reason.",
        ],
    },
    request: { method: "GET", path: "/api/quote" },
    input: { schema: { queryParams: zQuoteQueryParams } },
    timeouts: { requestMs: 15_000, runMs: 30_000 },
});
