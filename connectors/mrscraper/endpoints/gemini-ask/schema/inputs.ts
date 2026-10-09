import { z } from "zod";
import { zQuestion } from "../../../schema/common.ts";

/** POST /api/gemini/sync body — the vendor mirror (the marketplace card via v1,
 *  2026-09-17). */
export const zGeminiAskBody = z.object({
    query: zQuestion,
}).strict();
