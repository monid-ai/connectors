import { z } from "zod";

/**
 * web_wanderer/amazon-reviews-extractor — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/web_wanderer~amazon-reviews-extractor/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zAmazonReviewsExtractorBody = z.object({
    "personal_data": z.boolean().describe(
        "Scrape personal data (e.g., names, emails, identifiers). **GDPR (EU)** and **CCPA (California)** compliance required. Ensure legal justification or user consent.",
    ).optional(),
    "products": z.array(z.any()).describe(
        "The ASINs or URLs of the product you want to retrieve. For example: - Product URL: https://www.amazon.com/Logitech-LIGHTSPEED-Wireless-Gaming-Mouse/product-reviews/B07CMS5Q6P/ref=cm_cr_getr_mb_paging_btm_2?ie=UTF8&reviewerType=all_reviews&pageNumber=2&formatType=current_format - Product ID: B07MV...",
    ),
    "limit": z.number().int().min(1).max(50).describe(
        "Set number of pages to scrape, Amazon limits the number to 10 pages per product which are 100 review max. You can get more by setting Stars (one star, two stars, etc.), changing Variant, and Sort type.",
    ).optional(),
    "sort": z.enum(["helpful", "recent"]).describe("Select Sort type")
        .optional(),
    "stars": z.array(
        z.enum([
            "five_star",
            "four_star",
            "three_star",
            "two_star",
            "one_star",
        ]),
    ).describe(
        "Select the stars you want to scrape. You can select multiple stars",
    ).optional(),
    "all_stars": z.boolean().describe("Scrape up to 100 review per star")
        .optional(),
    "rating": z.enum([
        "all",
        "five_star",
        "four_star",
        "three_star",
        "two_star",
        "one_star",
        "positive",
        "critical",
    ]).describe(
        "Select reviews rating. This will filter reviews based on the stars.",
    ).optional(),
    "keywords": z.array(z.any()).describe(
        "Enter keywords that the review must have.",
    ).optional(),
    "avp_reviews": z.boolean().describe(
        "Return only reviews that have the verified purchase badge.",
    ).optional(),
    "include_variants": z.boolean().describe(
        "Whether to return reviews for product variants.",
    ).optional(),
    "start_date": z.string().describe(
        "Inclusive start of date range, format YYYY-MM-DD, e.g. 2025-06-01",
    ).optional(),
    "end_date": z.string().describe(
        "Inclusive end of date range, format YYYY-MM-DD, e.g. 2025-06-30",
    ).optional(),
    "scrape_image_reviews": z.boolean().describe(
        "Scrape reviews that contain images.",
    ).optional(),
    "scrape_video_reviews": z.boolean().describe(
        "Scrape reviews that contain videos.",
    ).optional(),
    "region": z.enum([
        "amazon.com",
        "amazon.ca",
        "amazon.de",
        "amazon.fr",
        "amazon.co.uk",
        "amazon.it",
        "amazon.es",
        "amazon.com.au",
        "amazon.co.jp",
        "amazon.com.br",
        "amazon.com.mx",
        "amazon.nl",
        "amazon.ie",
        "amazon.se",
        "amazon.com.tr",
        "amazon.ae",
        "amazon.sg",
        "amazon.sa",
        "amazon.pl",
        "amazon.com.be",
        "amazon.eg",
        "amazon.in",
    ]).describe("Select domain").optional(),
    "language": z.enum([
        "all",
        "en",
        "es",
        "fr",
        "de",
        "pt",
        "it",
        "nl",
        "pl",
        "sv",
        "cs",
        "zh_CN",
        "zh_TW",
        "ja",
        "ko",
        "ar",
        "tr",
    ]).describe("Filter reviews based on review language").optional(),
});
