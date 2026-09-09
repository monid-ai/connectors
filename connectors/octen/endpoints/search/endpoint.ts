import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zOctenSearchBody } from "./schema/inputs.ts";

/**
 * POST /search — minute-fresh web search.
 *
 * NATIVE usage: 1 call, plus full-content TOKENS when the gated tier fired
 * (`meta.usage.full_content_tokens` — only present with full_content.enable).
 * The `meta.usage` meter block is the billing receipt: absorbed into usage
 * (evidence keeps it verbatim).
 */
export default defineEndpoint({
    meta: {
        displayName: "Octen Web Search",
        summary: "Minute-fresh web search with filters and full content.",
        description: "Web search over the live internet with minute-level " +
            "freshness. Search the web and get ranked results (title, url, " +
            "highlight, authors, publish and crawl times, favicon), with " +
            "optional query-relevant highlights, domain include/exclude " +
            "filters, must/must-not text filters, publish/crawl time " +
            "windows, a news topic mode, and safesearch. Enable " +
            "full_content to return the complete page text for each result.",
        docsUrl: "https://docs.octen.ai/api-reference/search",
        categories: ["web-search", "news-search"],
    },
    request: { method: "POST", path: "/search" },
    input: {
        schema: {
            // vendor-documented API defaults, applied at the binding (moved
            // from the mirror — D25: mirrors carry optionality only):
            // topic "general", count 5, time_basis "auto", format "text",
            // safesearch "strict", include_images false. (The nested
            // highlight/full_content option defaults dropped to plain
            // optionality — absent means the vendor's own defaults.)
            body: zOctenSearchBody.extend({
                topic: zOctenSearchBody.shape.topic.unwrap()
                    .default("general"),
                count: zOctenSearchBody.shape.count.unwrap().default(5),
                time_basis: zOctenSearchBody.shape.time_basis.unwrap()
                    .default("auto"),
                format: zOctenSearchBody.shape.format.unwrap()
                    .default("text"),
                safesearch: zOctenSearchBody.shape.safesearch.unwrap()
                    .default("strict"),
                include_images: zOctenSearchBody.shape.include_images
                    .unwrap().default(false),
            }),
        },
    },
    usage: {
        /** Flat call fee AND gated full-content tokens (AND = COMPOSITE).
         *  Component ids spelled like octen's response fields (design D19)
         *  — no gate in the model: with full_content off the token count
         *  is simply absent (bills 0). */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                call: {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                    // 1 credit per call — v1 makeOctenCredit(1)
                    consumes: { credit: "default", amount: 1 },
                },
                full_content_tokens: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.TOKEN,
                    label: "content tokens",
                    // 1 credit per 1k tokens — v1 makePerUnitPrice(1cr, 1000)
                    every: 1000,
                    consumes: { credit: "default", amount: 1 },
                    description:
                        "full-content extraction tokens (only charged " +
                        "when full_content.enable is set)",
                },
            },
        },
        /** Full-content tokens depend on PAGE CONTENT — not deducible from
         *  the input, so the metered key is promised at the deducible
         *  floor 0 (design D24); settle trues it up from
         *  `meta.usage.full_content_tokens`. The flat "call" is
         *  engine-appended, never promised here. */
        estimate: () => ({ counts: { "full_content_tokens": 0 } }),
        consolidate: ({ data, utils }) => {
            const tokens = utils.json.optionalNum(
                data.output,
                "$.meta.usage.full_content_tokens",
            );
            return {
                usage: {
                    // the flat "call" line is engine-appended (D24/D26);
                    // meta.usage stays in the RAW run record
                    counts: {
                        ...(tokens !== undefined
                            ? { "full_content_tokens": tokens }
                            : {}),
                    },
                },
                output: utils.json.omit(data.output, ["usage"]),
            };
        },
    },
});
