import { z } from "zod";
import {
    zDevice,
    zGoogleLocale,
    zGoogleOrigin,
    zHttpUrl,
    zQuery,
} from "../../../../schema/common.ts";

/** GET /google/ai-mode query params (litescrape.com/docs/google-ai-mode, 2026-09-20). */
export const zGoogleAiModeQueryParams = z.object({
    q: zQuery.describe("The question to ask, up to 2,048 characters."),
    ...zGoogleOrigin,
    continuable: z.boolean().describe(
        "Return a subsequent_request_token so this answer can be followed up.",
    ).optional(),
    subsequent_request_token: z.string().min(1).describe(
        "Token from a previous continuable answer. Requires a new q; cannot be combined with image_url. Expires after 30 minutes.",
    ).optional(),
    image_url: zHttpUrl.max(2048).describe(
        "Public http or https image, up to 20 MB, added to the prompt via Google Lens.",
    ).optional(),
    ...zGoogleLocale,
    device: zDevice.describe(
        "Device layout Google renders. Default 'desktop'.",
    ).optional(),
}).strict();
