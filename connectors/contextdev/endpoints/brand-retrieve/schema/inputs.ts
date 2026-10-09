import { z } from "zod";
import {
    zBrandMaxAgeMs,
    zDomain,
    zTimeoutOpts,
} from "../../../schema/common.ts";

/**
 * POST /brand/retrieve body — the vendor mirror
 * (docs.context.dev/api-reference/brand-intelligence/brand, 2026-09-17):
 * ONE discriminated body, `type` selecting the lookup key. Context.dev
 * consolidated its separate domain / name / email / ticker / transaction
 * lookups into this body (changelog, July); `by_direct_url` scrapes brand
 * fields from one page and accepts no enrichment options. `tags` is not
 * carried.
 */

const zForceLanguage = z.string().min(2).describe(
    "Force the language of the returned brand copy (a language NAME, e.g. " +
        "'english', 'french', 'japanese').",
);

const zMaxSpeed = z.boolean().describe(
    "Optimize for speed: Context.dev skips time-consuming enrichment for a " +
        "faster response at the cost of less comprehensive data. Default " +
        "false.",
);

const zCountryGl = z.string().describe(
    "Country code hint (Google gl parameter) for the lookup.",
);

const enrichmentOptions = {
    force_language: zForceLanguage.optional(),
    maxSpeed: zMaxSpeed.optional(),
    maxAgeMs: zBrandMaxAgeMs.optional(),
    timeoutOpts: zTimeoutOpts.optional(),
};

export const zBrandByDomain = z.object({
    type: z.literal("by_domain").describe("Look the brand up by domain."),
    domain: zDomain.describe(
        "Domain to retrieve brand data for, e.g. 'stripe.com'.",
    ),
    ...enrichmentOptions,
}).strict();

export const zBrandByName = z.object({
    type: z.literal("by_name").describe("Look the brand up by company name."),
    name: z.string().min(3).max(30).describe(
        "Company name to resolve, e.g. 'Apple Inc'.",
    ),
    country_gl: zCountryGl.optional(),
    ...enrichmentOptions,
}).strict();

export const zBrandByEmail = z.object({
    type: z.literal("by_email").describe(
        "Look the brand up by a work email's domain.",
    ),
    email: z.string().min(1).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).describe(
        "WORK email address, e.g. 'jane@stripe.com'. Free-provider and " +
            "disposable addresses are rejected upstream with a 422 at no " +
            "charge.",
    ),
    ...enrichmentOptions,
}).strict();

export const zBrandByTicker = z.object({
    type: z.literal("by_ticker").describe("Look the brand up by stock ticker."),
    ticker: z.string().min(1).max(15).regex(/^[A-Za-z0-9.]+$/).describe(
        "Stock ticker to resolve, e.g. 'AAPL'.",
    ),
    ticker_exchange: z.string().describe(
        "Exchange code disambiguating the ticker, e.g. 'NASDAQ', 'NYSE', " +
            "'LSE'. Defaults to NASDAQ.",
    ).optional(),
    ...enrichmentOptions,
}).strict();

export const zBrandByDirectUrl = z.object({
    type: z.literal("by_direct_url").describe(
        "Scrape brand fields from one exact page — no domain resolution, " +
            "database lookup, or cross-source enrichment.",
    ),
    direct_url: z.string().regex(/^https?:\/\/\S+$/).describe(
        "Full http(s) URL to fetch brand data from, e.g. " +
            "'https://stripe.com/enterprise'.",
    ),
    timeoutOpts: zTimeoutOpts.optional(),
}).strict();

export const zBrandByTransaction = z.object({
    type: z.literal("by_transaction").describe(
        "Identify the merchant behind a card or bank statement descriptor.",
    ),
    transaction_info: z.string().min(3).max(500).describe(
        "The raw transaction descriptor, e.g. 'SQ *COFFEE BAR 4157...' or " +
            "'AMZN Mktp US*2K4TZ'.",
    ),
    country_gl: zCountryGl.optional(),
    city: z.string().describe(
        "City to prioritize when searching for the merchant.",
    ).optional(),
    mcc: z.union([z.string(), z.number()]).describe(
        "Merchant Category Code from the transaction, used to narrow the " +
            "business category.",
    ).optional(),
    phone: z.union([z.string(), z.number()]).describe(
        "Phone number from the transaction, used to verify the match.",
    ).optional(),
    high_confidence_only: z.boolean().describe(
        "Run an extra verification pass and only return a match " +
            "Context.dev is confident about. Default false.",
    ).optional(),
    force_language: zForceLanguage.optional(),
    maxSpeed: zMaxSpeed.optional(),
    timeoutOpts: zTimeoutOpts.optional(),
}).strict();

export const zBrandRetrieveBody = z.union([
    zBrandByDomain,
    zBrandByName,
    zBrandByEmail,
    zBrandByTicker,
    zBrandByDirectUrl,
    zBrandByTransaction,
]).describe(
    "Exactly one lookup, selected by type: by_domain, by_name, by_email, " +
        "by_ticker, by_direct_url, or by_transaction.",
);
