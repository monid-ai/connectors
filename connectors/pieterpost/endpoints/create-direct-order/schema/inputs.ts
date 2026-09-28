import { z } from "zod";
import {
    zPieterPostDirectOrderCommon,
    zPieterPostLetterRequestFields,
    zPieterPostPostcard,
} from "../../../schema/common.ts";

const zPieterPostDirectLetterOrder = z.object({
    ...zPieterPostDirectOrderCommon,
    ...zPieterPostLetterRequestFields,
    requestType: z.literal("letter"),
}).strict();

const zPieterPostDirectPostcardOrder = z.object({
    ...zPieterPostDirectOrderCommon,
    requestType: z.literal("postcard"),
    postcard: zPieterPostPostcard,
}).strict();

export const zPieterPostDirectOrderBody = z.discriminatedUnion(
    "requestType",
    [zPieterPostDirectLetterOrder, zPieterPostDirectPostcardOrder],
);
