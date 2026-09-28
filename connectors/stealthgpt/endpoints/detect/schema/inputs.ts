import { z } from "zod";

/** `POST /api/stealthify/detect` body: mirror of the published `DetectRequest`. */
export const zDetectBody = z.strictObject({
    text: z.string().min(1).describe(
        "The text to analyze. Maximum 3,000 words.",
    ),
});
