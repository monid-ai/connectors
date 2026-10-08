import { z } from "zod";

/**
 * `POST /embeddings` request body — the OpenAI-compatible shape Venice
 * accepts. Optionality only (D25). Venice embeds TEXT only: token-id arrays
 * are rejected upstream, so `input` is a string or an array of strings
 * (max 2048 items).
 */
export const zEmbeddingsModel = z.enum([
    "text-embedding-bge-m3",
    "text-embedding-bge-en-icl",
    "text-embedding-qwen3-8b",
    "text-embedding-qwen3-0-6b",
    "text-embedding-multilingual-e5-large-instruct",
    "text-embedding-nemotron-embed-vl-1b-v2",
    "text-embedding-3-small",
    "text-embedding-3-large",
    "gemini-embedding-2-preview",
]);

export const zEmbeddingsBody = z.object({
    model: zEmbeddingsModel.describe(
        "Embedding model. Private (Venice-hosted, never stored): " +
            "text-embedding-bge-m3, -bge-en-icl, -qwen3-8b, -qwen3-0-6b, " +
            "-multilingual-e5-large-instruct, -nemotron-embed-vl-1b-v2. " +
            "Anonymized proxies: text-embedding-3-small/-large, " +
            "gemini-embedding-2-preview.",
    ),
    input: z.union([
        z.string().min(1),
        z.array(z.string().min(1)).min(1).max(2048),
    ]).describe("Text to embed: one string or up to 2048 strings."),
    dimensions: z.number().int().min(1).optional().describe(
        "Truncate vectors to this many dimensions (models that support it).",
    ),
    encoding_format: z.enum(["float", "base64"]).optional().describe(
        "`float` arrays (vendor default) or base64-packed float32.",
    ),
});
