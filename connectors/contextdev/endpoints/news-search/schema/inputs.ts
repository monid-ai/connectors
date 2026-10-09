import { z } from "zod";

/** POST /news/search body — the vendor mirror
 *  (docs.context.dev/api-reference/news/search, 2026-09-17). The entity is
 *  the vendor's own discriminated one-of, mirrored as a union of literal
 *  `type` arms. `tags` is not carried. */

const zNewsEntity = z.union([
    z.object({
        type: z.literal("name"),
        name: z.string().min(2).max(200).describe("Company name."),
    }).strict(),
    z.object({
        type: z.literal("domain"),
        domain: z.string().min(1).max(253).describe(
            "Company website domain, e.g. 'apple.com'.",
        ),
    }).strict(),
    z.object({
        type: z.literal("ticker"),
        ticker: z.string().min(1).max(20).regex(/^[A-Za-z0-9.-]+$/).describe(
            "Public-company stock ticker, e.g. 'AAPL'.",
        ),
        exchange: z.string().min(2).max(10).describe(
            "Exchange code disambiguating a ticker listed on several " +
                "exchanges, e.g. 'NASDAQ', 'NYSE', 'LSE', 'XETRA'.",
        ).optional(),
    }).strict(),
    z.object({
        type: z.literal("isin"),
        isin: z.string().regex(/^[A-Za-z]{2}[A-Za-z0-9]{9}[0-9]$/).describe(
            "International Securities Identification Number, e.g. " +
                "'US0378331005'.",
        ),
    }).strict(),
]).describe(
    "The company to search news for — identify it by exactly one of name, " +
        "domain, ticker (optionally scoped to an exchange), or ISIN.",
);

const zNewsFilterBy = z.object({
    sourceDomain: z.array(z.string().min(1).max(253)).min(1).max(3)
        .describe("Publisher domains to include (up to 3).").optional(),
    sourceCountry: z.array(z.string().regex(/^[a-z]{2}$/)).min(1).max(3)
        .describe(
            "Publisher countries to include, as lowercase ISO 3166-1 " +
                "alpha-2 codes (up to 3).",
        ).optional(),
    articleLanguage: z.array(z.string().regex(/^[a-z]{2}$/)).min(1).max(3)
        .describe(
            "Article languages to include, as ISO 639-1 codes (up to 3).",
        ).optional(),
    articleType: z.array(z.enum([
        "editorial",
        "press_release",
        "regulatory_filing",
        "advisory",
    ])).min(1).max(3).describe(
        "Article types to include (up to 3) — separates independent " +
            "reporting (editorial) from company-issued content.",
    ).optional(),
    date: z.object({
        from: z.number().int().describe(
            "Inclusive start of the published-at window, epoch milliseconds.",
        ).optional(),
        to: z.number().int().describe(
            "Inclusive end of the published-at window, epoch milliseconds.",
        ).optional(),
    }).strict().describe("Published-at window in epoch milliseconds.")
        .optional(),
}).strict();

export const zNewsSearchBody = z.object({
    searchBy: z.object({
        type: z.literal("entity").describe(
            "How to search. Only entity search is supported.",
        ),
        entity: zNewsEntity,
    }).strict().describe("What to search for."),
    filterBy: zNewsFilterBy.describe("Optional result filters.").optional(),
    sortBy: z.object({
        type: z.enum(["relevance", "newest"]).describe("Result ordering."),
    }).strict().describe("Result ordering. Defaults to newest.").optional(),
    limit: z.number().int().min(1).max(100).describe(
        "Maximum articles to return (1-100). Default 10. Sizes the hold: " +
            "one credit per 10 articles.",
    ).optional(),
    cursor: z.string().max(300).describe(
        "Opaque next_cursor from the previous response to fetch the " +
            "following page. Each page bills its own articles.",
    ).optional(),
}).strict();
