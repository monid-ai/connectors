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
    input: {
        schema: {
            // vendor-documented API default "octen-embedding-4b" (moved
            // from the mirror — D25: mirrors carry optionality only).
            body: zOctenEmbeddingBody.extend({
                model: zOctenEmbeddingBody.shape.model.unwrap()
                    .default("octen-embedding-4b"),
            }),
        },
    },
    usage: {
        /** MODEL-SELECTED rates (design D19/D26 mode-selection): each
         *  embedding model is its own metered line with its own credit
         *  draw — v1 EMBEDDING_MODELS rates ($0.01/$0.04/$0.07 per 1M
         *  tokens at $0.001/credit = 10/40/70 credits per 1M). The fn
         *  populates only the selected model's key. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                embedding_0_6b: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.TOKEN,
                    label: "tokens (0.6b)",
                    every: 1_000_000,
                    consumes: { credit: "default", amount: 10 },
                },
                embedding_4b: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.TOKEN,
                    label: "tokens (4b)",
                    every: 1_000_000,
                    consumes: { credit: "default", amount: 40 },
                },
                embedding_8b: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.TOKEN,
                    label: "tokens (8b)",
                    every: 1_000_000,
                    consumes: { credit: "default", amount: 70 },
                },
            },
        },
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
            const key = data.input.body.model === "octen-embedding-0.6b"
                ? "embedding_0_6b"
                : data.input.body.model === "octen-embedding-8b"
                ? "embedding_8b"
                : "embedding_4b";
            return { counts: { [key]: bytes } };
        },
        evidence: ({ data, utils }) => {
            const tokens = utils.json.optionalNum(
                data.output,
                "$.meta.usage.input_tokens",
            ) ?? 0;
            // post-toRequest body: `model` carries the binding default
            const model = utils.json.optionalGet(
                data.input.body ?? {},
                "$.model",
            );
            const key = model === "octen-embedding-0.6b"
                ? "embedding_0_6b"
                : model === "octen-embedding-8b"
                ? "embedding_8b"
                : "embedding_4b";
            return { counts: { [key]: tokens } };
        },
    },
});
