import { z } from "zod";
import {
    zPieterPostIdempotencyKey,
    zPieterPostMetadata,
} from "../../../schema/common.ts";

export const zPieterPostCreditTopupBody = z.object({
    amountCents: z.number().int().min(500).max(50_000).multipleOf(100)
        .describe(
            "Top-up amount in whole cents, from 500 through 50000 and in whole-euro increments.",
        ),
    currency: z.enum(["eur", "usd"]).default("eur"),
    idempotencyKey: zPieterPostIdempotencyKey,
    metadata: zPieterPostMetadata.optional(),
    paymentMethod: z.enum(["auto", "card", "ideal"]).optional().describe(
        "Hosted payment method for live keys. ideal is only available for EUR.",
    ),
    returnUrl: z.string().url().optional().describe(
        "Optional URL for the payer after live Stripe Checkout.",
    ),
}).strict();
