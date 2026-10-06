import { z } from "zod";

/**
 * `POST /v1/fetch` request body — the vendor mirror (String's own docs,
 * portal.usestring.ai/docs/api-reference/fetch, read 2026-10-06).
 * Optionality only, per the mirror convention: String rejects any other
 * field with a 400, so the mirror is strict; defaults documented as vendor
 * behavior are applied at the endpoint binding, not here.
 *
 * `jsonSchema` (AI structured extraction) is deliberately NOT mirrored:
 * its surcharge is "metered per request, scales with page/schema size"
 * with no published flat rate — an unmoddelable line, left out of this
 * cut rather than priced by guess (see endpoint.ts).
 *
 * Cross-field rules the vendor documents (`headers` incompatible with
 * `executeJS`/`requireWSS`; `screenshot`/`actions` mutually exclusive and
 * restrict several other fields) are left to the vendor's own 400 rather
 * than re-encoded here, matching the sibling search mirror's minimalism.
 */
export const zFetchBody = z.object({
    // `z.url({protocol})` doesn't carry its protocol constraint through
    // to the compiled runtime validator (confirmed empirically: a
    // ftp:// URL passed it), so this mirrors the plain-regex convention
    // the rest of the repo already uses for URL fields (e.g.
    // connectors/minimax/schema/h3-video.ts).
    url: z.string().regex(
        /^https?:\/\/[^/?#\s]/,
        "must be a public http(s) URL",
    ).describe("The http/https URL to fetch."),
    // The `i` regex flag doesn't survive compilation to the runtime JSON
    // Schema `pattern` (confirmed empirically, same as the url protocol
    // constraint below), so case-insensitivity is spelled out with
    // per-letter character classes instead of a flag.
    method: z.string().regex(
        /^([gG][eE][tT]|[pP][oO][sS][tT]|[pP][uU][tT]|[pP][aA][tT][cC][hH]|[dD][eE][lL][eE][tT][eE]|[hH][eE][aA][dD]|[oO][pP][tT][iI][oO][nN][sS])$/,
    ).optional().describe(
        "HTTP method: GET, POST, PUT, PATCH, DELETE, HEAD or OPTIONS, in " +
            "any case (vendor default 'GET'). `body` is forbidden on GET " +
            "and HEAD.",
    ),
    body: z.union([z.string(), z.record(z.string(), z.unknown())])
        .optional().describe(
            "Request body. A string is sent as given; an object is sent " +
                "as its JSON text. Forbidden on GET and HEAD.",
        ),
    format: z.enum(["json", "raw", "markdown"]).optional().describe(
        "Response format (vendor default 'json').",
    ),
    markdownMode: z.enum(["readable", "full"]).optional().describe(
        "Markdown preservation level (vendor default 'full'). Only " +
            "affects markdown responses.",
    ),
    mainContentOnly: z.boolean().optional().describe(
        "Remove page chrome, keeping only main content (vendor default " +
            "false). Only affects markdown responses.",
    ),
    executeJS: z.boolean().optional().describe(
        "Render in a real browser. Incompatible with `headers`.",
    ),
    requireWSS: z.boolean().optional().describe(
        "Require a browser WebSocket fetch path. Incompatible with " +
            "`headers`.",
    ),
    headers: z.record(z.string(), z.string()).optional().describe(
        "Custom outbound headers (max 50). Direct fetch only.",
    ),
    countryCode: z.string().length(2).optional().describe(
        "ISO 3166-1 alpha-2 proxy country.",
    ),
    solveCaptcha: z.boolean().optional().describe(
        "Solve CAPTCHA challenges (vendor default true). false fails on " +
            "a challenge instead.",
    ),
    ignoreCertificateErrors: z.boolean().optional().describe(
        "Skip TLS certificate verification for this request (vendor " +
            "default false). Never applies to browser-rendered fetches.",
    ),
    screenshot: z.boolean().optional().describe(
        "Capture a screenshot. Shorthand for one screenshot action. " +
            "Mutually exclusive with `actions`.",
    ),
    actions: z.array(z.record(z.string(), z.unknown())).min(1).max(50)
        .optional().describe(
            "Browser actions to run (1-50). Mutually exclusive with " +
                "`screenshot`.",
        ),
}).strict();
