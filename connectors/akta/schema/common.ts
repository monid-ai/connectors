import { z } from "zod";

/** Shared fragments for the Akta endpoint schemas (ported from v1). */

export const zCompany = z.string().min(1).describe(
    "Company website (e.g. 'https://canva.com') or the company uuid " +
        "returned by the Akta Company Search endpoint. A bare company name " +
        "is NOT accepted here — resolve it via company-search first.",
);

export const zDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe(
    "Date formatted as YYYY-MM-DD.",
);

export const zNewsScore = z.enum(["High", "Medium", "Low", "all"]);

export const zSentiment = z.enum(["positive", "negative", "neutral", "all"]);

export const zSection = z.enum([
    "firmographic",
    "business_model",
    "company_assessment",
    "trust_signal",
    "company_hierarchy",
    "digital_presence",
    "financial_estimate",
    "location",
    "management_profile",
    "product_offering",
    "strategic_signal",
    "customer_profile",
    "industry",
    "technology",
    "funding_detail", // Enterprise-tier
    "mna_and_investment", // Enterprise-tier
]);
