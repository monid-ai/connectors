import { z } from "zod";
import {
    zPieterPostCheckoutCommon,
    zPieterPostLetterRequestFields,
    zPieterPostPostcard,
} from "../../../schema/common.ts";

const zPieterPostLetterCheckout = z.object({
    ...zPieterPostCheckoutCommon,
    ...zPieterPostLetterRequestFields,
    requestType: z.literal("letter"),
}).strict();

const zPieterPostPostcardCheckout = z.object({
    ...zPieterPostCheckoutCommon,
    requestType: z.literal("postcard"),
    postcard: zPieterPostPostcard,
}).strict();

export const zPieterPostCheckoutLinkBody = z.discriminatedUnion(
    "requestType",
    [zPieterPostLetterCheckout, zPieterPostPostcardCheckout],
);
