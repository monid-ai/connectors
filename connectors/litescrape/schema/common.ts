import { z } from "zod";

/**
 * Shared fragments of the Litescrape mirrors (ported from v1; checked
 * against the live reference, litescrape.com/docs/reference, 2026-09-20).
 * Every fragment here is composed by two or more endpoints; what one
 * endpoint uses alone lives in its own `schema/inputs.ts`.
 */

/** A search query — the Google and Bing families cap it at 2,048 characters. */
export const zQuery = z.string().min(1).max(2048);

/** Two-letter country code (the upstream lowercases it). */
export const zCountry = z.string().regex(/^[a-zA-Z]{2}$/);

/** Interface / result language such as 'en', 'en-GB', or 'de'. */
export const zLanguage = z.string().min(2).max(32);

export const zDevice = z.enum(["desktop", "tablet", "mobile"]);

/** Google's 0/1 toggles travel as strings on the wire. */
export const zFlag = z.enum(["0", "1"]);

export const zLat = z.number().min(-90).max(90);
export const zLon = z.number().min(-180).max(180);

/** A non-negative result offset. */
export const zOffset = z.number().int().min(0);

// An http(s) URL: the pattern survives compilation and keeps `data:` URIs
// (which would bloat the run record) off the wire.
export const zHttpUrl = z.string().regex(/^https?:\/\//);

/** `hl` / `gl` / `google_domain` — the Google localization trio. */
export const zGoogleLocale = {
    hl: zLanguage.describe(
        "Interface and result language, such as 'en', 'en-GB', or 'de'. Default 'en'.",
    ).optional(),
    gl: zCountry.describe(
        "Two-letter country code for result localization, such as 'us'.",
    ).optional(),
    google_domain: z.string().min(1).describe(
        "Google domain to query, such as 'google.com' or 'google.co.uk'. Default 'google.com'.",
    ).optional(),
};

/** `location` / `uule` — a named or pre-encoded Google search origin. */
export const zGoogleOrigin = {
    location: z.string().min(1).max(512).describe(
        "Human-readable search origin, such as 'Austin, Texas'. Cannot be combined with uule.",
    ).optional(),
    uule: z.string().min(1).max(2048).describe(
        "Pre-encoded Google location token. Cannot be combined with location.",
    ).optional(),
};

/** A Google Maps feature id — the `data_id` on a Maps result, `0x…:0x…`. */
export const zMapsDataId = z.string().regex(/^0x[0-9a-f]+:0x[0-9a-f]+$/i);
