import { z } from "zod";

/**
 * burbn/google-shopping-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/burbn~google-shopping-scraper/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zGoogleShoppingScraperBody = z.object({
    "searchQuery": z.string().describe(
        "Enter product name, brand, or keywords to search on Google Shopping. Examples: 'iPhone 15', 'Nike running shoes'.",
    ),
    "country": z.string().describe(
        "Country code for localized results. Uses ISO 3166-1 alpha-2 codes. Examples: 'us' (USA), 'gb' (UK), 'de' (Germany), 'in' (India).",
    ).optional(),
    "language": z.string().describe(
        "Language code for results. Uses ISO 639-1 codes. Examples: 'en' (English), 'es' (Spanish), 'fr' (French), 'de' (German).",
    ).optional(),
    "page": z.number().int().min(1).max(100).describe(
        "Page number to start fetching results from. Use this to skip initial pages. Default is 1 (first page).",
    ).optional(),
    "sortBy": z.enum([
        "BEST_MATCH",
        "LOWEST_PRICE",
        "HIGHEST_PRICE",
        "TOP_RATED",
    ]).describe(
        "Choose how to sort the search results. Sort by relevance, price, or rating.",
    ).optional(),
    "minPrice": z.number().describe(
        "Set a minimum price filter to only show products above this price. Leave empty for no minimum.",
    ).optional(),
    "maxPrice": z.number().describe(
        "Set a maximum price filter to only show products below this price. Leave empty for no maximum.",
    ).optional(),
    "productCondition": z.enum(["ANY", "NEW", "USED", "REFURBISHED"]).describe(
        "Filter products by their condition - new, used, refurbished, or any.",
    ).optional(),
    "limit": z.number().int().min(10).max(100).describe(
        "Number of products to fetch per API call. Min 1, Max 100. Default is 10.",
    ).optional(),
    "stores": z.string().describe(
        "Filter results by specific stores. Enter comma-separated store names. Example: 'Amazon,Walmart,Best Buy'.",
    ).optional(),
    "freeReturns": z.boolean().describe(
        "Show only products that offer free returns.",
    ).optional(),
    "freeShipping": z.boolean().describe(
        "Show only products with free shipping.",
    ).optional(),
    "onSale": z.boolean().describe(
        "Show only products that are currently on sale or have discounts.",
    ).optional(),
});
