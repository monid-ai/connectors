import { z } from "zod";

/**
 * Linkup /fetch request body — mirrors `FetchInput` from
 * https://api.linkup.so/v1/openapi.json. Strict: every field that moves the
 * price is modeled, so an unknown key is rejected here rather than sent
 * unpriced. The vendor's flags are `boolean | string`, as in the spec:
 * Linkup reads "true"/"false" case-insensitively and answers 400 to any other
 * string.
 */
export const zLinkupFetchBody = z.object({
    url: z.url().describe(
        "The public HTTP(S) page to fetch. HTML and PDF are supported.",
    ),
    mode: z.enum(["standard", "pro"]).describe(
        "Retrieval strategy. 'standard' for regular pages; 'pro' has " +
            "significantly higher success rates on hard-to-retrieve pages " +
            "(5x the price).",
    ).optional(),
    renderJs: z.boolean().or(z.string()).describe(
        "Render the page's JavaScript before extraction. Needed for " +
            "client-side-rendered pages (SPAs, many modern marketing sites).",
    ).optional(),
    includeRawContent: z.boolean().or(z.string()).describe(
        "Also return the raw page content (rawContent) and its contentType.",
    ).optional(),
    includeRawHtml: z.boolean().or(z.string()).describe(
        "Deprecated in favor of includeRawContent: also return rawHtml for " +
            "HTML pages.",
    ).optional(),
    extractImages: z.boolean().or(z.string()).describe(
        "Also return the page's images as a list of {alt, url}.",
    ).optional(),
    schema: z.record(z.string(), z.any()).describe(
        "JSON Schema (root type 'object') of data to extract from the page; " +
            "the response then carries it in `data`. Fields with no grounded " +
            "value are omitted.",
    ).optional(),
    instructions: z.string().max(4000).describe(
        "Extra extraction rules the schema cannot express. Requires schema.",
    ).optional(),
}).strict();
