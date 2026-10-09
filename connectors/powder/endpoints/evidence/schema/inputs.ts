import { z } from "zod";

/**
 * A narrow subset of Powder's V2 request schema. All keys below are native
 * upstream keys, not a separate Monid evidence model. Powder retains final
 * semantic validation (notably for ambiguous comparisons).
 */
export const zPowderEvidenceBody = z.object({
    query: z.string().trim().min(1).max(2000).describe(
        "Commerce decision or evidence question. For a comparison, name " +
            "both subjects in one unambiguous query without a brand or stable ID filter.",
    ),
    context: z.record(z.string(), z.unknown()).optional().describe(
        "Additional decision context; supplied to Powder unchanged.",
    ),
    vertical: z.string().max(128).optional(),
    category: z.string().max(128).optional(),
    brand: z.string().max(128).optional(),
    product_ids: z.array(z.string().max(128)).max(1).optional(),
    gtins: z.array(z.string().max(128)).max(1).optional(),
    skus: z.array(z.string().max(128)).max(1).optional(),
    requested_identity_levels: z.array(z.enum([
        "product",
        "sku",
        "gtin",
        "variant",
        "offer",
        "brand",
        "category",
        "merchant",
        "unknown",
    ])).max(9).optional(),
    evidence_types: z.array(z.enum([
        "behavioral",
        "outcome",
        "product",
        "catalog",
        "price",
        "promotion",
        "availability",
        "intent_context",
        "external",
    ])).max(10).optional(),
    max_external_sources: z.number().int().min(0).max(10).optional(),
    limit: z.number().int().min(1).max(10).optional(),
}).strict();
