import { z } from "zod";

/** Shared fragments for the Context.dev endpoint schemas — the vendor
 *  mirror (docs.context.dev/api-reference, 2026-09-17). Only what two or
 *  more endpoints use lives here. */

/** A page URL to fetch: Context.dev requires the http:// or https://
 *  scheme. A `pattern`, not a bare string — it survives compilation. */
export const zPageUrl = z.string().regex(/^https?:\/\/\S+$/).describe(
    "Full URL to fetch, including the http:// or https:// scheme.",
);

/** A bare domain (Context.dev normalizes and validates it upstream). */
export const zDomain = z.string().min(3).describe(
    "Domain name, e.g. 'example.com' (no scheme required).",
);

/** A page URL used INSTEAD of domain resolution (screenshot, fonts,
 *  styleguide, products). */
export const zDirectUrl = z.string().regex(/^https?:\/\/\S+$/).describe(
    "Exact URL to use, bypassing domain resolution (e.g. " +
        "'https://example.com/pricing'). Mutually exclusive with domain.",
);

/** Residential proxy exit country — the vendor's `BrowserCountryCode`
 *  enum (docs.context.dev/openapi.json, 2026-09-17; 204 codes). web/search
 *  localizes against a different list and keeps its own. */
export const zCountry = z.enum([
    "ad",
    "ae",
    "af",
    "ag",
    "ai",
    "al",
    "am",
    "ao",
    "ar",
    "at",
    "au",
    "aw",
    "az",
    "ba",
    "bb",
    "bd",
    "be",
    "bf",
    "bg",
    "bh",
    "bi",
    "bj",
    "bm",
    "bn",
    "bo",
    "bq",
    "br",
    "bs",
    "bw",
    "by",
    "bz",
    "ca",
    "cd",
    "cf",
    "cg",
    "ch",
    "ci",
    "cl",
    "cm",
    "cn",
    "co",
    "cr",
    "cv",
    "cw",
    "cy",
    "cz",
    "de",
    "dj",
    "dk",
    "dm",
    "do",
    "dz",
    "ec",
    "ee",
    "eg",
    "es",
    "et",
    "fi",
    "fj",
    "fr",
    "ga",
    "gb",
    "gd",
    "ge",
    "gf",
    "gg",
    "gh",
    "gm",
    "gn",
    "gp",
    "gq",
    "gr",
    "gt",
    "gu",
    "gw",
    "gy",
    "hk",
    "hn",
    "hr",
    "ht",
    "hu",
    "id",
    "ie",
    "il",
    "im",
    "in",
    "iq",
    "ir",
    "is",
    "it",
    "je",
    "jm",
    "jo",
    "jp",
    "ke",
    "kg",
    "kh",
    "kn",
    "kr",
    "kw",
    "ky",
    "kz",
    "la",
    "lb",
    "lc",
    "lk",
    "lr",
    "ls",
    "lt",
    "lu",
    "lv",
    "ly",
    "ma",
    "mc",
    "md",
    "me",
    "mf",
    "mg",
    "mk",
    "ml",
    "mm",
    "mn",
    "mo",
    "mq",
    "mr",
    "mt",
    "mu",
    "mv",
    "mw",
    "mx",
    "my",
    "mz",
    "na",
    "nc",
    "ne",
    "ng",
    "ni",
    "nl",
    "no",
    "np",
    "nz",
    "om",
    "pa",
    "pe",
    "pf",
    "pg",
    "ph",
    "pk",
    "pl",
    "pr",
    "ps",
    "pt",
    "py",
    "qa",
    "re",
    "ro",
    "rs",
    "ru",
    "rw",
    "sa",
    "sc",
    "sd",
    "se",
    "sg",
    "si",
    "sk",
    "sl",
    "sm",
    "sn",
    "so",
    "sr",
    "ss",
    "st",
    "sv",
    "sx",
    "sy",
    "sz",
    "tc",
    "td",
    "tg",
    "th",
    "tj",
    "tl",
    "tm",
    "tn",
    "tr",
    "tt",
    "tw",
    "tz",
    "ua",
    "ug",
    "us",
    "uy",
    "uz",
    "vc",
    "ve",
    "vg",
    "vi",
    "vn",
    "ye",
    "yt",
    "za",
    "zm",
    "zw",
]).describe(
    "Two-letter ISO 3166-1 alpha-2 country code, lowercase (e.g. 'us', " +
        "'gb', 'de'). Must be one of Context.dev's supported countries.",
);

/** Cache reuse window for the scrape family (default 1 day, max 30 days;
 *  0 forces a fresh fetch). */
export const zScrapeMaxAgeMs = z.number().int().min(0).max(2592000000)
    .describe(
        "Reuse a cached result younger than this many milliseconds. Default " +
            "86400000 (1 day), max 2592000000 (30 days). Set 0 to always " +
            "fetch fresh.",
    );

/** Cache reuse window for the brand family (default 3 months). */
export const zBrandMaxAgeMs = z.number().int().min(0).describe(
    "Maximum age in milliseconds of cached brand data before Context.dev " +
        "hard-refreshes it. Default 7776000000 (3 months). Set 0 to always " +
        "refresh.",
);

/** Extra browser wait after page load, before content is captured. */
export const zWaitForMs = z.number().int().min(0).max(30000).describe(
    "Extra browser wait in milliseconds after page load before the content " +
        "is captured (0-30000). Useful for JavaScript-heavy pages.",
);

/** Zero-data-retention switch (requires ZDR enabled on the account). */
export const zZdr = z.enum(["enabled", "disabled"]).describe(
    "Set 'enabled' to bypass Context.dev's shared caches and omit request " +
        "and response content from its retained usage logs. Requires zero " +
        "data retention on the Context.dev organization, otherwise the call " +
        "fails with ZDR_NOT_ENABLED.",
);

/** `light` / `dark` theme emulation (screenshot + styleguide). */
export const zColorScheme = z.enum(["light", "dark"]).describe(
    "Browser color scheme to emulate for sites that honor " +
        "prefers-color-scheme.",
);

/** Per-call upstream deadline (POST endpoints; the GETs spell it as a
 *  deep-object query param the engine cannot send — design D6). */
export const zTimeoutOpts = z.object({
    milliseconds: z.number().int().min(1000).max(300000).describe(
        "Request deadline in milliseconds (1000-300000).",
    ),
    behavior: z.enum(["fail", "return-partial"]).describe(
        "What to do at the deadline: 'fail' returns 408 at no charge " +
            "(default); 'return-partial' returns the usable results " +
            "collected so far and bills them.",
    ).optional(),
}).strict().describe("Request deadline and behavior on timeout.");

/** PDF handling for the crawl-shaped POSTs. */
export const zPdfOptions = z.object({
    shouldParse: z.boolean().describe(
        "Fetch and parse PDF pages. When false, PDFs are skipped entirely. " +
            "Default true.",
    ).optional(),
    ocr: z.boolean().describe(
        "OCR the selected PDF pages that have no usable text layer " +
            "(scans). Default false. An OCR'd page costs an extra credit " +
            "upstream.",
    ).optional(),
    start: z.number().int().min(1).describe(
        "First 1-based PDF page to parse.",
    ).optional(),
    end: z.number().int().min(1).describe(
        "Last 1-based PDF page to parse. Must be >= start.",
    ).optional(),
}).strict();

/** Markdown conversion switches shared by the scrape + crawl + search
 *  families. */
export const markdownOptionFields = {
    includeLinks: z.boolean().describe(
        "Preserve hyperlinks in the Markdown output. Default true.",
    ),
    includeImages: z.boolean().describe(
        "Include image references in the Markdown output. Default false.",
    ),
    shortenBase64Images: z.boolean().describe(
        "Truncate inline base64 image payloads to keep the output small. " +
            "Default true.",
    ),
    useMainContentOnly: z.boolean().describe(
        "Keep only the page's main content, dropping headers, footers, " +
            "sidebars, and navigation when detectable. Default false.",
    ),
    includeFrames: z.boolean().describe(
        "Render iframe contents into the output. Default false.",
    ),
};
