import { z } from "zod";

export const zPieterPostWalletQuery = z.object({
    currency: z.enum(["eur", "usd"]).default("eur").describe(
        "Wallet currency to read.",
    ),
}).strict();
