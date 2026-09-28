import { z } from "zod";

export const zReceiptPathParams = z.object({
    code: z.string().min(1).describe(
        "The public receipt code from a completed order or its verifyUrl, " +
            "not a Stripe payment ID or an order ID.",
    ),
});
