import { z } from "zod";

/**
 * web_wanderer/amazon-reviews-extractor — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-10 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zAmazonReviewsExtractorOutputItem = z.any();
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zAmazonReviewsExtractorOutput = z.array(
    zAmazonReviewsExtractorOutputItem.or(z.record(z.string(), z.unknown())),
);
