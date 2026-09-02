import { defineEndpoint } from "@shared/core";
import { zOctenEmbeddingBody } from "./schema/inputs.ts";

/**
 * POST /embedding — text embeddings.
 *
 * NATIVE usage: input TOKENS (`meta.usage.input_tokens` is the billing
 * receipt); a missing receipt settles at 0 — money follows evidence.
 */
export default defineEndpoint({
    meta: {
        displayName: "Octen Embedding",
        summary: "Text → embedding vectors, three model sizes.",
        description: "Convert text into vector representations for search " +
            "and retrieval. Batch input (max 32768 tokens per element), " +
            "three model sizes (octen-embedding-0.6b/-4b/-8b trading cost " +
            "vs accuracy), configurable output dimension, and " +
            "query/document input typing for retrieval asymmetry. Billed " +
            "per input token at the selected model's rate " +
            "(meta.usage.input_tokens is the billing receipt).",
        docsUrl: "https://docs.octen.ai/api-reference/embedding",
        categories: ["embeddings"],
    },
    request: { method: "POST", path: "/embedding" },
    input: { schema: { body: zOctenEmbeddingBody } },
    usage: {
        consolidate: ({ data, utils }) => ({
            usage: {
                units: [{
                    amount: utils.json.optionalNum(
                        data.output,
                        "$.meta.usage.input_tokens",
                    ) ?? 0,
                    unit: "token",
                }],
                evidence: utils.json.pick(data.output, ["$.meta.usage"]),
            },
            output: utils.json.omit(data.output, ["usage"]),
        }),
    },
});
