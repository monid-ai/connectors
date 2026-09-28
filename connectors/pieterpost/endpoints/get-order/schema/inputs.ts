import { z } from "zod";

export const zPieterPostOrderPath = z.object({
    orderId: z.string().min(1).max(140).describe(
        "PieterPost order id returned by a checkout-link or direct-order request.",
    ),
}).strict();
