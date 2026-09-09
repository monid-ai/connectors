import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
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
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.TOKEN },
        /** Tokens deduced from TEXT LENGTH as the UTF-8 byte count of the
         *  input strings — v1's exact basis (embedding.ts
         *  `embeddingHoldTokens`): these models tokenize with byte-level
         *  BPE, where every token consumes ≥1 input byte, so the byte
         *  count is a provable ceiling the settle trues DOWN from
         *  (`meta.usage.input_tokens` is the receipt). Byte width per code
         *  point is plain arithmetic (TextEncoder is not a whitelisted
         *  global in closed-term fns). */
        estimate: ({ data }) => {
            let bytes = 0;
            for (const text of data.input.body.input) {
                for (const ch of text) {
                    const cp = ch.codePointAt(0) ?? 0;
                    bytes += cp <= 0x7f
                        ? 1
                        : cp <= 0x7ff
                        ? 2
                        : cp <= 0xffff
                        ? 3
                        : 4;
                }
            }
            return { counts: { "TOKEN": bytes } };
        },
        consolidate: ({ data, utils }) => ({
            usage: {
                counts: {
                    "TOKEN": utils.json.optionalNum(
                        data.output,
                        "$.meta.usage.input_tokens",
                    ) ?? 0,
                },
                evidence: utils.json.pick(data.output, ["$.meta.usage"]),
            },
            output: utils.json.omit(data.output, ["usage"]),
        }),
    },
});
