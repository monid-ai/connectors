import { defineEndpoint } from "@shared/core";
import { zEuAmazonSellersEmailLeadsBody } from "./schema/inputs.ts";

/**
 * xmiso_scrapers/eu-amazon-sellers-email-leads — Find Amazon Sellers (EU). Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Find Amazon Sellers (EU)",
        summary: "Extract Amazon seller business data and contact leads " +
            "across EU and US marketplaces.",
        description: "Extracts Amazon seller business data across EU and US " +
            "marketplaces by category and country, from a database " +
            "of 200K+ scraped sellers. Returns seller identity and " +
            "profile, legal and registration details, VAT and " +
            "company identifiers, contact emails and phone numbers, " +
            "physical addresses, associated product listings with " +
            "product identifiers, and time-windowed seller ratings " +
            "and review metrics (lifetime, 1-year, 3-months).",
        docsUrl:
            "https://apify.com/xmiso_scrapers/eu-amazon-sellers-email-leads",
        categories: ["amazon", "company-enrichment"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/xmiso_scrapers~eu-amazon-sellers-email-leads/runs",
    },
    input: { schema: { body: zEuAmazonSellersEmailLeadsBody } },
});
