import { z } from "zod";

/** Shared fragments for the MrScraper endpoint schemas — the vendor
 *  mirror (docs.mrscraper.com and the vendor's marketplace catalog via v1,
 *  2026-09-17). Only what two or more endpoints use lives here. */

/**
 * A marketplace scraper's target URL, gated to its own site: the vendor
 * bills full catalog price for a "soft failure" (2xx + `data.status:
 * "FAIL"`, e.g. "Could not extract ASIN" on a wrong-site URL), so the
 * cheap mistakes are rejected before the wire. A `pattern`, not a
 * `superRefine` — it survives compilation (design D6).
 *
 * Matching is two-speed, as v1's: the HOST is strict — the brand must be
 * the REGISTRABLE label, i.e. the second-to-last label (`amazon.com`,
 * `smile.amazon.de`) or the third-to-last under a second-level public
 * suffix (`amazon.co.uk`, `lazada.com.my` — the country label is exactly
 * two letters, tighter than v1, so `amazon.com.evil` does not pass);
 * `amazon.attacker.example` does not match. The PATH is lenient: a `pathPattern` (a regex source
 * matched from the first `/` after the host) only where the site's URL
 * format is unambiguous.
 */
export function siteUrl(i: {
    /** Human site name for the description. */
    site: string;
    /** Acceptable registrable labels (lowercase). */
    brands: readonly string[];
    /** Example URL shown in the description. */
    example: string;
    /** Optional path gate: a regex source matched against the URL from
     *  the first `/` after the host, as a prefix — whatever follows it must
     *  be whitespace-free to the end. */
    pathPattern?: string;
    /** Human name of the path shape, e.g. "product (/dp/)". */
    pathNote?: string;
}) {
    const label = (brand: string) =>
        brand.split("").map((c) =>
            /[a-z]/.test(c) ? `[${c.toUpperCase()}${c}]` : c
        ).join("");
    const brands = i.brands.map(label).join("|");
    const suffix =
        "(?:[A-Za-z]{2,}|(?:ac|co|com|edu|gov|net|org)\\.[A-Za-z]{2})";
    const host = `(?:[A-Za-z0-9-]+\\.)*(?:${brands})\\.${suffix}(?::\\d+)?`;
    const path = i.pathPattern ?? "(?:[/?#]|$)";
    const pattern = new RegExp(`^https?://${host}${path}\\S*$`);
    return z.string().regex(pattern).describe(
        `Full ${i.site} page URL${
            i.pathNote ? ` — a ${i.pathNote} URL` : ""
        }, e.g. ${i.example}`,
    );
}

/** A marketplace scraper body that is just the gated URL. */
export const urlOnlyBody = (url: z.ZodType) => z.object({ url }).strict();

/** A Lazada page on any Lazada country site (the category and the product
 *  scrapers). */
export const zLazadaUrl = siteUrl({
    site: "Lazada",
    brands: ["lazada"],
    example: "https://www.lazada.sg/products/pdp-i3158507329-s22328619522.html",
});

/** A Booking.com hotel page (the rates and the reviews scrapers). */
export const zBookingUrl = siteUrl({
    site: "Booking.com",
    brands: ["booking"],
    example: "https://www.booking.com/hotel/th/admiral.html",
});

/** An Expedia page (the hotel rates and the hotel search scrapers). */
export const zExpediaUrl = siteUrl({
    site: "Expedia",
    brands: ["expedia"],
    example: "https://www.expedia.com/Hotel-Search?destination=Bangkok",
});

/** A Trip.com hotel page (the rates and the reviews scrapers). */
export const zTripUrl = siteUrl({
    site: "Trip.com",
    brands: ["trip"],
    example: "https://us.trip.com/hotels/shanghai-hotel-detail-992573/",
});

/** A calendar date as the travel scrapers take it (Google Flights, the
 *  hotel-ID scrapers, the airline fare search). */
export const zIsoDate = z.iso.date();

/** A three-letter IATA airport code (Google Flights, the airline fare
 *  search). */
export const zIataCode = z.string().regex(/^[A-Za-z]{3}$/);

/** The stay fields the hotel-ID scrapers share (Agoda, Tiket, Trip.com). */
export const zGuestCounts = {
    rooms: z.number().int().min(1).describe("Number of rooms."),
    adults: z.number().int().min(1).describe("Number of adult guests."),
    children: z.number().int().min(0).describe("Number of child guests."),
};

export const zCurrency = z.string().length(3).describe(
    "Three-letter currency code for returned prices, e.g. 'USD'.",
);

export const zLocale = z.string().min(2).describe(
    "Locale for returned content, e.g. 'en-US'.",
);

/** The vendor's documented pass-through flag (its examples use 1). */
export const zLoginFlag = z.number().int().describe(
    "Upstream login-state flag passed to the scraper verbatim (the " +
        "vendor's examples use 1).",
);

/** US ZIP or postal code the vendor applies before loading a store page so
 *  price and availability reflect that location (the CVS, Home Depot,
 *  Kroger, and Meijer scrapers). */
export const zZipCode = z.string().min(3).describe(
    "ZIP or postal code used for localized pricing and availability.",
);

/** Any page URL (the playground scrapes anything). */
export const zAnyPageUrl = z.string().regex(/^https?:\/\/\S+$/).describe(
    "Full URL to scrape, including the http:// or https:// scheme.",
);

/** The playground's AI prompt. */
export const zPrompt = z.string().min(1).describe(
    "Natural-language description of the data to extract (field names, " +
        "shape); append a 'Json Schema:' section to shape the output. " +
        "Parses the scraped content only — it cannot steer the scraper.",
);

/** Playground options the upstream reads from the QUERY STRING; each
 *  endpoint's `toRequest` lifts them out of the body (design D2). */
export const playgroundOptionFields = {
    geoCode: z.string().length(2).describe(
        "Two-letter country code to load the page from (default 'us').",
    ),
    proxyCountry: z.string().length(2).describe(
        "Two-letter country code of the proxy exit (default 'us').",
    ),
    browserRendering: z.boolean().describe(
        "Render the page in a real Chromium browser. Required for " +
            "JavaScript-heavy sites and SPAs. Default false.",
    ),
    waitUntil: z.enum([
        "domcontentloaded",
        "load",
        "networkidle0",
        "networkidle2",
    ]).describe(
        "When the browser considers navigation complete (browser " +
            "rendering only). 'networkidle0' is the most thorough but " +
            "slowest. Default 'domcontentloaded'.",
    ),
    timeout: z.number().int().min(1).max(300).describe(
        "Maximum seconds to wait for the page to fully load (default 300).",
    ),
    blockResources: z.boolean().describe(
        "Skip images, fonts, and stylesheets to speed up scraping and cut " +
            "bandwidth-driven token usage. Default false.",
    ),
    waitForSelector: z.string().min(1).describe(
        "Wait until this CSS selector appears in the DOM before " +
            "extracting — for content that loads after the initial page.",
    ),
    super: z.boolean().describe(
        "Route through real devices to bypass hard anti-bot protection. " +
            "Uses more upstream resources, so runs consume more tokens. " +
            "Default false.",
    ),
};

/** Two-letter country code that localizes a Google or AI search. */
export const zSearchCountry = z.string().length(2).describe(
    "Two-letter country code that localizes the search, e.g. 'us'.",
);

/** A natural-language question for the AI-search scrapers. */
export const zQuestion = z.string().min(1).describe(
    "Natural-language question or search query to answer.",
);
