import { z } from "zod";

/**
 * xmiso_scrapers/eu-amazon-sellers-email-leads — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/xmiso_scrapers~eu-amazon-sellers-email-leads/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zEuAmazonSellersEmailLeadsBody = z.object({
    "amazon_category": z.enum([
        "Automotive",
        "Baby Products",
        "Beauty",
        "Books",
        "Clothing, Shoes & Jewelry",
        "Business, Industry & Science",
        "Computers",
        "DIY & Tools",
        "Electronics",
        "Fashion",
        "Garden",
        "Grocery",
        "Handmade Products",
        "Health & Personal Care",
        "Health & Household",
        "Home & Kitchen",
        "Industrial & Scientific",
        "Large Appliances",
        "Lighting",
        "Musical Instruments & DJ",
        "Office Products",
        "PC & Video Games",
        "Pet Supplies",
        "Sports & Outdoors",
        "Stationery & Office Supplies",
        "Tools",
        "Toys",
    ]).describe("Select the Amazon category").optional(),
    "seller_country": z.enum([
        "US",
        "CN",
        "DE",
        "AT",
        "AU",
        "BE",
        "BG",
        "CA",
        "CH",
        "CY",
        "CZ",
        "DK",
        "EE",
        "ES",
        "FI",
        "FR",
        "GB",
        "GR",
        "HK",
        "HU",
        "IE",
        "IN",
        "IT",
        "JP",
        "KR",
        "LT",
        "LV",
        "NL",
        "PL",
        "PT",
        "RO",
        "SE",
        "SI",
        "SK",
        "TR",
        "TW",
    ]).describe(
        "Select sellers country of residence. Useful when you want to filter out sellers from countries you are not interested in.",
    ).optional(),
    "date_added": z.string().describe(
        "Select only leads discovered after this date (YYYY-MM-DD)",
    ).optional(),
    "max_results": z.number().int().max(100000).describe(
        "Maximum results you want to get",
    ).optional(),
    "offset": z.number().int().max(999999).describe(
        "How many rows to skip. Useful when you already downloaded x rows and don't want to get duplicates",
    ).optional(),
});
