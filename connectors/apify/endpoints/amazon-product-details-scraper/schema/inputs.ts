import { z } from "zod";

/**
 * delicious_zebu/amazon-product-details-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/delicious_zebu~amazon-product-details-scraper/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zAmazonProductDetailsScraperBody = z.object({
    "Params": z.array(z.any()).describe(
        "Enter the Amazon Standard Identification Numbers (ASINs) or the full product page URLs you want to scrape. You can mix both formats. Examples: - ASIN: B077Z99YGY - URL: https://www.amazon.com/dp/B077Z99YGY Use this field to get deep insights for specific items you already know.",
    ),
});
