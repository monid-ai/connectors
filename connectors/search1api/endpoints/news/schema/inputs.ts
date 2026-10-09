import { z } from "zod";
import { zNewsService, zSearchCommon } from "../../../schema/common.ts";

/** `POST /news` request body — same shape as `/search`, news engines. */
export const zNewsBody = z.object({
    ...zSearchCommon,
    search_service: zNewsService.optional().describe(
        "News backend to use (default: the vendor's pick — Bing).",
    ),
}).strict();
