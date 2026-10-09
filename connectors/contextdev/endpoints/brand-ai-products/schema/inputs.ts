import { z } from "zod";
import {
    zDirectUrl,
    zDomain,
    zScrapeMaxAgeMs,
    zTimeoutOpts,
} from "../../../schema/common.ts";

/** POST /brand/ai/products body — the vendor mirror
 *  (docs.context.dev/api-reference/web-extraction/products, 2026-09-17):
 *  the vendor's own one-of (start from a domain, or from an exact URL),
 *  mirrored as a union. `tags` is not carried. */

const catalogOptions = {
    maxProducts: z.number().int().min(1).max(12).describe(
        "Maximum number of products to extract (1-12). Does not change the " +
            "price.",
    ).optional(),
    maxAgeMs: zScrapeMaxAgeMs.describe(
        "Reuse a cached result younger than this many milliseconds. Default " +
            "604800000 (7 days), max 2592000000 (30 days).",
    ).optional(),
    timeoutOpts: zTimeoutOpts.optional(),
};

export const zProductsBody = z.union([
    z.object({
        domain: zDomain.describe(
            "The brand domain to analyze, e.g. 'example.com'.",
        ),
        ...catalogOptions,
    }).strict(),
    z.object({
        directUrl: zDirectUrl.describe(
            "Exact URL to start from, bypassing domain resolution (e.g. a " +
                "pricing or shop page).",
        ),
        ...catalogOptions,
    }).strict(),
]).describe("Start from a domain or from a directUrl.");
