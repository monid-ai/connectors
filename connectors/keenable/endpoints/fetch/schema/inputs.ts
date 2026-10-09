import { z } from "zod";

/**
 * GET /v1/fetch query params — OpenAPI fetch parameters
 * (docs.keenable.ai api-reference/openapi.json, 2026-09-16). Mirror
 * carries optionality only (D25): `max_chars` vendor default 50000
 * is a behaviour knob the estimate does not read (the model is
 * PER_CALL), so it stays optional. Bounds live at the binding in
 * endpoint.ts. `live` draws one credit like an indexed fetch (MCP
 * `_meta["keenable/usage"]`, drill 2026-09-28; design D4).
 */
export const zKeenableFetchQueryParams = z.object({
    url: z.url({ protocol: /^https?$/ }).describe(
        "URL to fetch. Without `live`, Keenable's indexed copy; a URL " +
            "not in the index is an error.",
    ),
    max_chars: z.number().int().describe(
        "Maximum number of characters of content to return. Longer " +
            "content is truncated and a notice is appended after the " +
            "cut, so the response runs slightly past this number. " +
            "Vendor default 50000.",
    ).optional(),
    live: z.boolean().describe(
        "Fetch the page live from the source instead of Keenable's " +
            "indexed copy (default false). Same price; slower (a few " +
            "seconds).",
    ).optional(),
    prompt: z.string().describe(
        "Optional extraction instruction, at most 2000 characters. " +
            "When set, an LLM reads the fetched page and `content` " +
            "contains only the output for this instruction instead of " +
            "the full page. Example: 'List all pricing tiers with " +
            "their monthly prices'.",
    ).optional(),
}).strict();
