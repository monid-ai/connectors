import { z } from "zod";

/**
 * JobsPipe `POST /v1/stack/scan` request body — the faithful mirror of the
 * published OpenAPI `StackScanRequest` (docs.jobspipe.dev, 2026-10-07):
 * `domain` required, `mode` optional with vendor default "auto" (no
 * `.default()` here — D25; the vendor applies it server-side).
 */
export const zJobsPipeStackScanBody = z.strictObject({
    domain: z.string().min(1).describe(
        "The domain to scan, e.g. stripe.com.",
    ),
    mode: z.enum(["auto", "html", "render"]).describe(
        "Optional scan mode. Defaults to auto.",
    ).optional(),
});
