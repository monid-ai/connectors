import { z } from "zod";

/** TRDEFI /api/quote query params. */
export const zQuoteQueryParams = z.object({
    hash: z.string().min(1).describe(
        "Strategy hash (0x-prefixed, 64 hex chars) of the position to " +
            "fill against — a hash returned by /api/strategies.",
    ),
    chain: z.string().min(1).optional().describe(
        "Chain key the strategy lives on (e.g. 'ethereum', 'base', " +
            "'arc'). Defaults to 'ethereum'.",
    ),
    amount: z.string().min(1).describe(
        "Input amount in token base units, as an integer string (e.g. " +
            "'1000000' = 1 USDC at 6 decimals). Which side it counts " +
            "against is set by direction.",
    ),
    direction: z.enum(["aToB", "bToA"]).optional().describe(
        "'aToB' (default): amount is the A-side token. 'bToA': amount is " +
            "the B-side token.",
    ),
    from: z.string().min(1).optional().describe(
        "Your own 0x address, used as msg.sender for the on-chain " +
            "simulation. Pass it when the maker gates the strategy on the " +
            "caller holding an access token — without it a gated strategy " +
            "answers UNPROCESSABLE instead of a price.",
    ),
}).strict();
