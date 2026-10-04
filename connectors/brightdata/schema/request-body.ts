import { z } from "zod";

/**
 * The `POST /request` body, mirrored from Bright Data's published OpenAPI
 * (`PostBody`) — the fields BOTH products share. SERP API and Web Unlocker
 * API are one wire path with two zone types, so the common mirror lives
 * here and each endpoint extends it with the fields its own product
 * documents (design D2).
 *
 * `zone` is REQUIRED by the vendor and deliberately ABSENT from the mirror:
 * it names a resource inside the key-holder's account, so it is credential
 * material that `auth.inject` supplies at egress, never a caller argument
 * (design D1). It is the connector's one documented divergence from the
 * published body — the exa posture, where a field the caller must not send
 * simply is not in the schema.
 *
 * Optionality only, no `.default()` (D25): Bright Data documents a default
 * for `method` (`GET`) but the wire accepts the body without it, so the
 * default stays the vendor's to apply.
 */
export const zBrightdataRequestBody = z.object({
    url: z.string().min(1).describe(
        "Complete target URL to fetch, including protocol. Must be " +
            "publicly reachable.",
    ),
    format: z.enum(["raw", "json"]).describe(
        "Envelope format. `raw` returns the fetched payload as the response " +
            "body itself. `json` wraps it as " +
            "`{status_code, headers, body}`, where `body` is the payload as " +
            "a string — use it when the target's own status code and " +
            "headers matter to the caller.",
    ),
    method: z.string().optional().describe(
        "HTTP method used against the TARGET url. Defaults to `GET`.",
    ),
    country: z.string().optional().describe(
        "Two-letter ISO 3166-1 country code to egress from (`us`, `gb`, " +
            "`de`). Omitted, Bright Data picks a location from the zone's " +
            "own configuration.",
    ),
    // Bright Data also documents `screenshot` (a PNG of the rendered page).
    // It is left out until the engine carries binary bodies: the transport
    // reads every body as text, which would corrupt the image.
    data_format: z.enum(["markdown"]).optional().describe(
        "Payload transformation applied before the envelope. `markdown` " +
            "converts the fetched HTML to clean markdown. Omitted, the " +
            "payload is the target's own HTML.",
    ),
});
