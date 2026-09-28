import { z } from "zod";

/**
 * MCP `create_brand_from_url` arguments — hosted schema 2026-09-22.
 * `url` required; `persist` optional (default true upstream).
 */
export const zCreateBrandFromUrlBody = z.object({
    url: z.string().describe(
        'The brand website URL, e.g. "https://acme.com".',
    ),
    persist: z.boolean().optional().describe(
        "Save the discovered brand to Brand Memory (default true). " +
            "false = read-only preview.",
    ),
});
