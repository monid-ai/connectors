import { z } from "zod";

export const zOrderPath = z.object({
    nonce: z.string().uuid().describe(
        "The original order_nonce UUID. This read never creates or charges an order.",
    ),
}).strict();
