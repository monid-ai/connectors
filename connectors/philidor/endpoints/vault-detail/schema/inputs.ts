import { z } from "zod";

export const zVaultDetailPathParams = z.object({
    network: z.string().min(1).describe(
        "Network slug, such as ethereum, base, arbitrum, or solana.",
    ),
    address: z.string().min(1).describe("Vault contract address."),
});

export const zVaultDetailQueryParams = z.object({
    points: z.number().int().min(1).max(2160).optional().describe(
        "Snapshot points embedded in the detail response. Defaults to 360; maximum 2160.",
    ),
});
