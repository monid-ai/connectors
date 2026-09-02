import { z } from "zod";

/** Octen /embedding body (ported from v1). */
const EMBEDDING_MODEL_NAMES = [
    "octen-embedding-0.6b", // high-volume / low-cost
    "octen-embedding-4b", // balanced (default)
    "octen-embedding-8b", // best accuracy
] as const;

export const zOctenEmbeddingBody = z.object({
    input: z.array(z.string()).min(1).describe(
        "Texts to embed (max 32768 tokens per element).",
    ),
    model: z.enum(EMBEDDING_MODEL_NAMES).default("octen-embedding-4b"),
    dimension: z.number().int().positive().optional().describe(
        "Output vector dimensionality (defaults to the model's max).",
    ),
    input_type: z.enum(["query", "document"]).optional().describe(
        "Whether the input is a retrieval query or a document.",
    ),
}).strict();
