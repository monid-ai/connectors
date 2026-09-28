import { z } from "zod";
import {
    zPieterPostIdempotencyKey,
    zPieterPostLocale,
    zPieterPostMetadata,
    zPieterPostRecipient,
} from "../../../schema/common.ts";

export const zPieterPostComposeLinkBody = z.object({
    idempotencyKey: zPieterPostIdempotencyKey,
    recipient: zPieterPostRecipient,
    message: z.string().max(6_000).optional().describe(
        "Optional prefilled letter text. The user can review and edit it in PieterPost.",
    ),
    locale: zPieterPostLocale.optional(),
    externalId: z.string().min(1).max(140).optional(),
    metadata: zPieterPostMetadata.optional(),
}).strict();
