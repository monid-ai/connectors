import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zEmbeddingsBody } from "./schema/inputs.ts";

/**
 * Venice `POST /embeddings` — text → vectors, one blocking call.
 *
 * Venice reports QUANTITIES (`usage.prompt_tokens`) but no cost on this
 * endpoint (`cost` is null), so the pinned rate card is the bill
 * (design D2): one PER_UNIT line per model price tier, LINEAR per-token
 * amounts (no `every` block — a 5-token call must not pay a 1M block).
 * Rates from GET /models?type=embedding, verified 2026-10-08, in $/1M
 * input tokens:
 *   - tier_0125: 0.0125 — bge-en-icl, qwen3-8b, qwen3-0-6b,
 *     multilingual-e5-large-instruct, nemotron-embed-vl-1b-v2
 *   - tier_025:  0.025  — text-embedding-3-small
 *   - tier_15:   0.15   — bge-m3
 *   - tier_1625: 0.1625 — text-embedding-3-large
 *   - tier_25:   0.25   — gemini-embedding-2-preview
 * The fns populate only the selected model's line.
 */
export default defineEndpoint({
    meta: {
        displayName: "Venice Embeddings",
        summary: "Text → embedding vectors, private or anonymized models.",
        description: "Convert text into vectors for search, retrieval, " +
            "clustering and RAG. Choose a PRIVATE Venice-hosted model " +
            "(inputs never stored or logged) — `text-embedding-bge-m3` " +
            "(multilingual, 1024 dims), `text-embedding-qwen3-8b`, " +
            "`text-embedding-qwen3-0-6b`, `text-embedding-bge-en-icl`, " +
            "`text-embedding-multilingual-e5-large-instruct`, " +
            "`text-embedding-nemotron-embed-vl-1b-v2` — or an anonymized " +
            "proxy to `text-embedding-3-small`/`-large` or " +
            "`gemini-embedding-2-preview`. Up to 2048 strings per call; " +
            "text only (token-id arrays are rejected). Billed per input " +
            "token at the model's rate; `usage.prompt_tokens` on the " +
            "response is the billing basis.",
        docsUrl:
            "https://docs.venice.ai/api-reference/endpoint/embeddings/generate",
        categories: ["embeddings"],
    },
    request: { method: "POST", path: "/embeddings" },
    input: { schema: { body: zEmbeddingsBody } },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                tier_0125: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.TOKEN,
                    label: "tokens ($0.0125/1M)",
                    description: "bge-en-icl, qwen3-8b, qwen3-0-6b, " +
                        "multilingual-e5-large-instruct, " +
                        "nemotron-embed-vl-1b-v2 — $0.0125 per 1M input " +
                        "tokens, linear",
                    consumes: { credit: "default", amount: 0.0000000125 },
                },
                tier_025: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.TOKEN,
                    label: "tokens ($0.025/1M)",
                    description: "text-embedding-3-small — $0.025 per 1M " +
                        "input tokens, linear",
                    consumes: { credit: "default", amount: 0.000000025 },
                },
                tier_15: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.TOKEN,
                    label: "tokens ($0.15/1M)",
                    description: "text-embedding-bge-m3 — $0.15 per 1M " +
                        "input tokens, linear",
                    consumes: { credit: "default", amount: 0.00000015 },
                },
                tier_1625: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.TOKEN,
                    label: "tokens ($0.1625/1M)",
                    description: "text-embedding-3-large — $0.1625 per 1M " +
                        "input tokens, linear",
                    consumes: { credit: "default", amount: 0.0000001625 },
                },
                tier_25: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.TOKEN,
                    label: "tokens ($0.25/1M)",
                    description: "gemini-embedding-2-preview — $0.25 per " +
                        "1M input tokens, linear",
                    consumes: { credit: "default", amount: 0.00000025 },
                },
            },
        },
        /** Ceiling: UTF-8 bytes of the input (byte-level BPE consumes ≥1
         *  byte per token), priced on the selected model's line. */
        estimate: ({ data }) => {
            const texts = typeof data.input.body.input === "string"
                ? [data.input.body.input]
                : data.input.body.input;
            let bytes = 0;
            for (const text of texts) {
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
            const m = data.input.body.model;
            const key = m === "text-embedding-bge-m3"
                ? "tier_15"
                : m === "text-embedding-3-small"
                ? "tier_025"
                : m === "text-embedding-3-large"
                ? "tier_1625"
                : m === "gemini-embedding-2-preview"
                ? "tier_25"
                : "tier_0125";
            return { counts: { [key]: bytes } };
        },
        /** `usage.prompt_tokens` is the receipt; a missing receipt settles
         *  at 0 — money follows evidence. */
        evidence: ({ data, utils }) => {
            const tokens = utils.json.optionalNum(
                data.output,
                "$.usage.prompt_tokens",
            ) ?? 0;
            const m = utils.json.optionalGet(data.input.body ?? {}, "$.model");
            const key = m === "text-embedding-bge-m3"
                ? "tier_15"
                : m === "text-embedding-3-small"
                ? "tier_025"
                : m === "text-embedding-3-large"
                ? "tier_1625"
                : m === "gemini-embedding-2-preview"
                ? "tier_25"
                : "tier_0125";
            return { counts: { [key]: tokens } };
        },
    },
});
