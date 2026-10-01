import { z } from "zod";

/**
 * Linkup /search request body — mirrors `SearchInput` from
 * https://api.linkup.so/v1/openapi.json. Strict: every field that moves the
 * price is modeled, so an unknown key is rejected here rather than sent
 * unpriced. The vendor's boolean flags also accept strings; the mirror takes
 * booleans only.
 */
export const zLinkupSearchBody = z.object({
    q: z.string().min(1).describe(
        "The natural-language question to retrieve web context for.",
    ),
    depth: z.enum(["flash", "fast", "standard", "deep"]).describe(
        "Search mode. 'flash': ranked sources and snippets in a few hundred " +
            "milliseconds. 'fast': higher-quality one-shot retrieval in " +
            "about a second. 'standard': one pass of agentic search for " +
            "queries that span several topics or sources. 'deep': several " +
            "search iterations for coverage and multi-hop questions " +
            "(10x the price).",
    ),
    outputType: z.enum(["searchResults", "sourcedAnswer", "structured"])
        .describe(
            "'searchResults': raw sources (name, url, content). " +
                "'sourcedAnswer': a written answer plus its sources. " +
                "'structured': JSON matching structuredOutputSchema.",
        ),
    structuredOutputSchema: z.string().describe(
        "Required when outputType is 'structured': a JSON Schema, " +
            "serialized as a string, whose root is type 'object'.",
    ).optional(),
    includeSources: z.boolean().describe(
        "Only with outputType 'structured': wrap the response as " +
            "{data, sources}.",
    ).optional(),
    includeInlineCitations: z.boolean().describe(
        "Only with outputType 'sourcedAnswer': add inline citations to " +
            "the answer.",
    ).optional(),
    includeImages: z.boolean().describe(
        "Include image results alongside text results.",
    ).optional(),
    maxResults: z.number().int().min(1).describe(
        "Upper bound on the number of results returned.",
    ).optional(),
    includeDomains: z.array(z.string()).max(100).describe(
        "Only search these domains (up to 100), e.g. 'microsoft.com'.",
    ).optional(),
    excludeDomains: z.array(z.string()).describe(
        "Drop results from these domains, e.g. 'wikipedia.org'.",
    ).optional(),
    fromDate: z.iso.date().describe(
        "Only consider results from this date on (YYYY-MM-DD).",
    ).optional(),
    toDate: z.iso.date().describe(
        "Only consider results up to this date (YYYY-MM-DD).",
    ).optional(),
}).strict();
